import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVideoProvider } from "@/lib/video";
import { broadcastClassStarted } from "@/lib/class/realtime";
import { fanOutSessionStarted } from "@/lib/class/live-realtime";
import { notifyUsers } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function randomPasscode() {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * POST /api/teacher/classes/[classId]/start-now — start an AD-HOC class session
 * on demand, with NO pre-scheduled session required.
 *
 * Once an admin has assigned a class to a teacher, the teacher can open the
 * room any time (to get prepared, or to run a session with people they pick).
 * This:
 *   1. verifies the caller owns the class (or is an admin),
 *   2. reuses today's existing LIVE/SCHEDULED-now session if one exists, else
 *      creates a fresh ClassSession scheduled for now,
 *   3. ensures a Zoom meeting (idempotent), flips the session LIVE, and
 *   4. lights up the admin live monitor (per-user + admin-live fan-out).
 *
 * SILENT by design: unlike the scheduled-start route, it does NOT push
 * "class is live" notifications to enrolled students/parents — the teacher
 * shares the join link themselves with whomever they want. The host start URL
 * is returned for the teacher; the join URL is the shareable link.
 *
 * Response: { ok, sessionId, meetingId, meetingPassword, zoomStartUrl,
 *             zoomJoinUrl, zoomMeetingId, sessionStatus: "LIVE", created }
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { classId: string } | Promise<{ classId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { classId } = await Promise.resolve(params);

  try {
    const klass = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: { include: { user: true } },
        enrollments: {
          where: { status: "ACTIVE" },
          include: { student: { include: { user: true } } },
        },
      },
    });
    if (!klass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Ownership: a teacher may only start their OWN class.
    if (session.user.role === "TEACHER") {
      const tp = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!tp || tp.id !== klass.teacherId) {
        return NextResponse.json({ error: "This is not your class" }, { status: 403 });
      }
    }

    // Reuse an already-LIVE session for this class if one is open (so a double
    // tap doesn't spawn duplicate rooms); otherwise create a fresh ad-hoc one.
    const existingLive = await prisma.classSession.findFirst({
      where: { classId: klass.id, status: "LIVE" },
      orderBy: { startedAt: "desc" },
    });

    let cs =
      existingLive ??
      (await prisma.classSession.create({
        data: {
          classId: klass.id,
          scheduledDate: new Date(),
          status: "SCHEDULED",
          notes: "Ad-hoc session started by teacher",
        },
      }));
    const created = !existingLive;

    let zoomMeetingId = cs.zoomMeetingId;
    let zoomJoinUrl = cs.zoomJoinUrl;
    let zoomPassword = cs.zoomPassword;

    const provider = getVideoProvider();
    if (!zoomMeetingId) {
      const hostEmail = (process.env.ZOOM_HOST_EMAIL ?? "").trim();
      if (hostEmail) {
        try {
          const passcode = randomPasscode();
          const meeting = await provider.createMeeting({
            topic: `${klass.nameAr ?? klass.name} — ${klass.cohortCode}`,
            scheduledFor: cs.scheduledDate,
            durationMinutes: klass.durationMinutes,
            hostEmail,
            password: passcode,
            autoRecording: true,
          });
          zoomMeetingId = meeting.meetingId;
          zoomJoinUrl = meeting.joinUrl;
          zoomPassword = meeting.password ?? passcode;
        } catch (e) {
          console.error("[teacher/start-now] Zoom create failed:", e);
        }
      }
    } else {
      try {
        await provider.ensureJoinableSettings(zoomMeetingId);
      } catch (e) {
        console.error("[teacher/start-now] ensureJoinableSettings:", e);
      }
    }

    // Fresh host start URL — these expire, so always fetch on start.
    let zoomStartUrl: string | null = null;
    if (zoomMeetingId) {
      try {
        zoomStartUrl = await provider.getMeetingStartUrl(zoomMeetingId);
      } catch (e) {
        console.error("[teacher/start-now] getMeetingStartUrl failed:", e);
      }
    }

    const wasAlreadyLive = cs.status === "LIVE";

    cs = await prisma.classSession.update({
      where: { id: cs.id },
      data: {
        status: "LIVE",
        startedAt: cs.startedAt ?? new Date(),
        zoomMeetingId,
        zoomJoinUrl,
        zoomPassword,
      },
    });

    const className = klass.nameAr ?? klass.name;
    const teacherName = klass.teacher.user.nameAr ?? klass.teacher.user.name;
    const startedAtIso = (cs.startedAt ?? new Date()).toISOString();

    // Legacy per-class channel (existing LiveClassBanner) + admin live monitor.
    // NOTE: intentionally NO triggerClassStarted() here — this is a silent prep
    // start, so enrolled students/parents are not paged. Admins still see it.
    const legacyBroadcasted = await broadcastClassStarted({
      classId: klass.id,
      sessionId: cs.id,
      zoomJoinUrl,
      className,
    });

    let liveBroadcasted = 0;
    try {
      const adminUsers = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
        select: { id: true },
      });
      // Fan out to admins only (live monitor). Students are deliberately omitted
      // for the silent prep start.
      liveBroadcasted = await fanOutSessionStarted(
        {
          sessionId: cs.id,
          classId: klass.id,
          className,
          teacherName,
          startedAt: startedAtIso,
          meetingId: zoomMeetingId,
        },
        adminUsers.map((u) => u.id),
      );

      if (!wasAlreadyLive && adminUsers.length > 0) {
        await notifyUsers(
          adminUsers.map((u) => u.id),
          {
            type: "CLASS_STARTING",
            title: "Class room opened",
            titleAr: "تم فتح غرفة الحصة",
            message: `${className} — ${teacherName} opened the room.`,
            messageAr: `${className} — فتح ${teacherName} الغرفة.`,
            link: `/admin/live`,
          },
        );
      }
    } catch (e) {
      console.error("[teacher/start-now] live fan-out failed:", e);
    }

    await logAudit({
      userId: session.user.id,
      action: "CLASS_SESSION_STARTED_ADHOC",
      entity: "ClassSession",
      entityId: cs.id,
      metadata: {
        classId: klass.id,
        created,
        silent: true,
        meetingId: zoomMeetingId,
        wasAlreadyLive,
        legacyBroadcasted,
        liveBroadcasted,
      },
    });

    return NextResponse.json({
      ok: true,
      sessionId: cs.id,
      meetingId: zoomMeetingId,
      meetingPassword: zoomPassword,
      zoomStartUrl,
      zoomJoinUrl,
      zoomMeetingId,
      sessionStatus: "LIVE" as const,
      created,
    });
  } catch (e) {
    console.error("[teacher/classes/[classId]/start-now] failed:", e);
    return NextResponse.json(
      { ok: false, error: "Could not start the class" },
      { status: 500 },
    );
  }
}
