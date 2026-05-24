import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVideoProvider } from "@/lib/video";
import { broadcastClassStarted } from "@/lib/class/realtime";
import { fanOutSessionStarted } from "@/lib/class/live-realtime";
import { triggerClassStarted } from "@/lib/comms/triggers";
import { notifyUsers } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function randomPasscode() {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * POST /api/class-sessions/[id]/start — a teacher (or admin) starts a class.
 *
 * Ensures a Zoom meeting exists (idempotent), flips the session LIVE,
 * fetches a fresh host start URL, broadcasts `session_started` on the
 * per-class + per-user + admin-live Realtime channels, fires
 * student/parent notifications, and also notifies admins so the live
 * monitor lights up.
 *
 * Response:
 *   { ok, sessionId, meetingId, meetingPassword, zoomStartUrl,
 *     zoomJoinUrl, sessionStatus: "LIVE" }
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolved = await Promise.resolve(params);
  const sessionId = resolved.id;

  try {
    const cs = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          include: {
            teacher: { include: { user: true } },
            enrollments: {
              where: { status: "ACTIVE" },
              include: { student: { include: { user: true } } },
            },
          },
        },
      },
    });
    if (!cs) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.user.role === "TEACHER") {
      const tp = await prisma.teacherProfile.findUnique({
        where: { userId: session.user.id },
      });
      if (!tp || tp.id !== cs.class.teacherId) {
        return NextResponse.json(
          { error: "This is not your class" },
          { status: 403 }
        );
      }
    }

    if (cs.status === "COMPLETED" || cs.status === "CANCELLED") {
      return NextResponse.json(
        { error: "This session has already ended" },
        { status: 400 }
      );
    }

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
            topic: `${cs.class.nameAr ?? cs.class.name} — ${cs.class.cohortCode}`,
            scheduledFor: cs.scheduledDate,
            durationMinutes: cs.class.durationMinutes,
            hostEmail,
            password: passcode,
            autoRecording: true,
          });
          zoomMeetingId = meeting.meetingId;
          zoomJoinUrl = meeting.joinUrl;
          zoomPassword = meeting.password ?? passcode;
        } catch (e) {
          console.error("[class-sessions/start] Zoom create failed:", e);
        }
      }
    } else {
      try {
        await provider.ensureJoinableSettings(zoomMeetingId);
      } catch (e) {
        console.error("[class-sessions/start] ensureJoinableSettings:", e);
      }
    }

    // Fresh host start URL — these expire, so always fetch on start.
    let zoomStartUrl: string | null = null;
    if (zoomMeetingId) {
      try {
        zoomStartUrl = await provider.getMeetingStartUrl(zoomMeetingId);
      } catch (e) {
        console.error("[class-sessions/start] getMeetingStartUrl failed:", e);
      }
    }

    const wasAlreadyLive = cs.status === "LIVE";

    await prisma.classSession.update({
      where: { id: cs.id },
      data: {
        status: "LIVE",
        startedAt: cs.startedAt ?? new Date(),
        zoomMeetingId,
        zoomJoinUrl,
        zoomPassword,
      },
    });

    const className = cs.class.nameAr ?? cs.class.name;
    const teacherName =
      cs.class.teacher.user.nameAr ?? cs.class.teacher.user.name;
    const startedAtIso = (cs.startedAt ?? new Date()).toISOString();

    // Legacy per-class channel (subscribed by existing LiveClassBanner).
    const legacyBroadcasted = await broadcastClassStarted({
      classId: cs.classId,
      sessionId: cs.id,
      zoomJoinUrl,
      className,
    });

    // New per-user fan-out: enrolled students + active admins + admin-live.
    let liveBroadcasted = 0;
    try {
      const studentUserIds = cs.class.enrollments.map((e) => e.student.user.id);
      const adminUsers = await prisma.user.findMany({
        where: {
          role: { in: ["ADMIN", "SUPER_ADMIN"] },
          isActive: true,
        },
        select: { id: true },
      });
      const recipientUserIds = Array.from(
        new Set([...studentUserIds, ...adminUsers.map((u) => u.id)])
      );
      liveBroadcasted = await fanOutSessionStarted(
        {
          sessionId: cs.id,
          classId: cs.classId,
          className,
          teacherName,
          startedAt: startedAtIso,
          meetingId: zoomMeetingId,
        },
        recipientUserIds
      );

      // Admin in-app notifications (students/parents are covered by
      // triggerClassStarted below). Skip when re-starting an already
      // LIVE session — avoid duplicate spam.
      if (!wasAlreadyLive && adminUsers.length > 0) {
        await notifyUsers(
          adminUsers.map((u) => u.id),
          {
            type: "CLASS_STARTING",
            title: "Class started",
            titleAr: "بدأت حصة",
            message: `${className} — ${teacherName} is live now.`,
            messageAr: `${className} — ${teacherName} مباشر الآن.`,
            link: `/admin/live`,
          }
        );
      }
    } catch (e) {
      console.error("[class-sessions/start] live fan-out failed:", e);
    }

    // Student + parent push notifications (existing trigger), only on
    // first transition to LIVE — idempotent re-starts skip.
    if (!wasAlreadyLive) {
      try {
        await triggerClassStarted(cs.id);
      } catch (e) {
        console.error("[class-sessions/start] notifications failed:", e);
      }
    }

    await logAudit({
      userId: session.user.id,
      action: "CLASS_SESSION_STARTED",
      entity: "ClassSession",
      entityId: cs.id,
      metadata: {
        classId: cs.classId,
        legacyBroadcasted,
        liveBroadcasted,
        meetingId: zoomMeetingId,
        wasAlreadyLive,
      },
    });

    return NextResponse.json({
      ok: true,
      sessionId: cs.id,
      meetingId: zoomMeetingId,
      meetingPassword: zoomPassword,
      zoomStartUrl,
      zoomJoinUrl,
      sessionStatus: "LIVE" as const,
    });
  } catch (e) {
    console.error("[class-sessions/[id]/start] failed:", e);
    return NextResponse.json(
      { ok: false, error: "Could not start the class" },
      { status: 500 }
    );
  }
}
