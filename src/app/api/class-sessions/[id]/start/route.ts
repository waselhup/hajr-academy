import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVideoProvider } from "@/lib/video";
import { broadcastClassStarted } from "@/lib/class/realtime";
import { triggerClassStarted } from "@/lib/comms/triggers";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function randomPasscode() {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * POST /api/class-sessions/[id]/start — a teacher (or admin) starts a class.
 *
 * Ensures a Zoom meeting exists (idempotent), flips the session to LIVE,
 * broadcasts `class_started` on the class Realtime channel so every
 * enrolled student's dashboard lights up instantly, and fires the
 * student + parent notifications. A realtime/notification failure does
 * not fail the request — the session is already LIVE and joinable.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const cs = await prisma.classSession.findUnique({
      where: { id: params.id },
      include: { class: { include: { teacher: true } } },
    });
    if (!cs) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // A teacher may only start their own class.
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

    // Ensure a Zoom meeting exists (create on first start — idempotent).
    let zoomMeetingId = cs.zoomMeetingId;
    let zoomJoinUrl = cs.zoomJoinUrl;
    let zoomPassword = cs.zoomPassword;

    if (!zoomMeetingId) {
      const hostEmail = (process.env.ZOOM_HOST_EMAIL ?? "").trim();
      if (hostEmail) {
        try {
          const provider = getVideoProvider();
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
          // Zoom failure must not block starting the class — the session
          // still goes LIVE; the join link can be retried.
          console.error("[class-sessions/start] Zoom create failed:", e);
        }
      }
    } else {
      // Meeting already exists — re-apply the "students can always join"
      // settings. Repairs meetings created before this policy so a
      // re-click of "Start" fixes a class students couldn't join.
      try {
        await getVideoProvider().ensureJoinableSettings(zoomMeetingId);
      } catch (e) {
        console.error("[class-sessions/start] ensureJoinableSettings:", e);
      }
    }

    // Flip the session LIVE.
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

    // Broadcast to every enrolled student's dashboard (best-effort).
    const broadcasted = await broadcastClassStarted({
      classId: cs.classId,
      sessionId: cs.id,
      zoomJoinUrl,
      className: cs.class.nameAr ?? cs.class.name,
    });

    // Push notifications to students + parents (best-effort).
    try {
      await triggerClassStarted(cs.id);
    } catch (e) {
      console.error("[class-sessions/start] notifications failed:", e);
    }

    await logAudit({
      userId: session.user.id,
      action: "CLASS_SESSION_STARTED",
      entity: "ClassSession",
      entityId: cs.id,
      metadata: { classId: cs.classId, broadcasted },
    });

    return NextResponse.json({
      ok: true,
      sessionId: cs.id,
      zoomMeetingId,
      zoomJoinUrl,
      broadcasted,
    });
  } catch (e) {
    console.error("[class-sessions/[id]/start] failed:", e);
    return NextResponse.json(
      { ok: false, error: "Could not start the class" },
      { status: 500 }
    );
  }
}
