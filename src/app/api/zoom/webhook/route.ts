import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyZoomWebhook, buildUrlValidationResponse } from "@/lib/video/zoom-webhook";
import { finalizeSessionAttendance } from "@/lib/attendance";
import { logAudit } from "@/lib/audit";
import { notifyUsers, parentUserIdsForStudents } from "@/lib/notify";
import { createEarningForSession } from "@/lib/teacher-earnings";
import { enqueueLessonSummary } from "@/lib/ai/lesson-summary";
import { fetchZoomTranscript } from "@/lib/zoom/transcripts";
import {
  fanOutSessionStarted,
  fanOutSessionEnded,
} from "@/lib/class/live-realtime";
import { broadcastClassEnded } from "@/lib/class/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ZoomParticipant = { user_id?: string; user_name?: string; email?: string; id?: string };
type ZoomEvent = {
  event: string;
  payload?: {
    plainToken?: string;
    object?: {
      id?: string | number;
      uuid?: string;
      participant?: ZoomParticipant;
      recording_files?: { play_url?: string; download_url?: string }[];
      share_url?: string;
      password?: string;
    };
  };
};

/** Locate the ClassSession tied to a Zoom meeting id. */
async function findSessionByMeeting(meetingId: string) {
  return prisma.classSession.findFirst({
    where: { zoomMeetingId: meetingId },
    include: { class: { include: { enrollments: true } } },
  });
}

/**
 * Handle meeting.started — idempotent. Flips the session LIVE, fan-out
 * broadcasts, and creates student/admin notifications ONLY if no
 * CLASS_STARTING notification exists for this session in the last hour
 * (avoids duplicate spam when teacher uses our Start button AND Zoom
 * fires the webhook).
 */
async function handleMeetingStarted(meetingId: string) {
  const cs = await findSessionByMeeting(meetingId);
  if (!cs) return;

  const wasAlreadyLive = cs.status === "LIVE";

  // Persist LIVE status (idempotent — same value if already LIVE).
  if (!wasAlreadyLive) {
    await prisma.classSession.update({
      where: { id: cs.id },
      data: { status: "LIVE", startedAt: cs.startedAt ?? new Date() },
    });
  }

  // Hydrate the names we need for the broadcast payload.
  const cls = await prisma.class.findUnique({
    where: { id: cs.classId },
    include: {
      teacher: { include: { user: { select: { name: true, nameAr: true } } } },
    },
  });
  const className = cls?.nameAr ?? cls?.name ?? "Class";
  const teacherName =
    cls?.teacher.user.nameAr ?? cls?.teacher.user.name ?? "Teacher";

  // Fan-out broadcast: per-class + per-user + admin-live.
  try {
    const studentProfiles = await prisma.studentProfile.findMany({
      where: { id: { in: cs.class.enrollments.map((e) => e.studentId) } },
      select: { userId: true },
    });
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
      select: { id: true },
    });
    const recipientUserIds = Array.from(
      new Set([
        ...studentProfiles.map((p) => p.userId),
        ...admins.map((a) => a.id),
      ])
    );
    await fanOutSessionStarted(
      {
        sessionId: cs.id,
        classId: cs.classId,
        className,
        teacherName,
        startedAt: (cs.startedAt ?? new Date()).toISOString(),
        meetingId,
      },
      recipientUserIds
    );
  } catch (e) {
    console.error("[zoom/webhook] meeting.started fan-out failed:", e);
  }

  // Dedupe notifications — only create if no CLASS_STARTING notification
  // exists for this session in the last hour.
  const oneHourAgo = new Date(Date.now() - 3600_000);
  const existing = await prisma.notification.count({
    where: {
      type: "CLASS_STARTING",
      refType: "ClassSession",
      refId: cs.id,
      createdAt: { gte: oneHourAgo },
    },
  });
  if (existing > 0) return;

  // Notify enrolled students.
  const studentProfiles = await prisma.studentProfile.findMany({
    where: { id: { in: cs.class.enrollments.map((e) => e.studentId) } },
    select: { userId: true },
  });
  await notifyUsers(
    studentProfiles.map((p) => p.userId),
    {
      type: "CLASS_STARTING",
      title: "Class started",
      titleAr: "بدأت حصتك",
      message: `${className} is live now — join from your dashboard.`,
      messageAr: `${className} مباشرة الآن — ادخل من لوحتك.`,
      link: `/student`,
      refType: "ClassSession",
      refId: cs.id,
    } as any
  );

  // Notify active admins so the live monitor lights up.
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
    select: { id: true },
  });
  if (admins.length > 0) {
    await notifyUsers(
      admins.map((u) => u.id),
      {
        type: "CLASS_STARTING",
        title: "Class started",
        titleAr: "بدأت حصة",
        message: `${className} — ${teacherName} is live now.`,
        messageAr: `${className} — ${teacherName} مباشر الآن.`,
        link: `/admin/live`,
        refType: "ClassSession",
        refId: cs.id,
      } as any
    );
  }
}

async function handleParticipantJoined(meetingId: string, p: ZoomParticipant) {
  const cs = await findSessionByMeeting(meetingId);
  if (!cs) return;
  const email = p.email?.toLowerCase();
  if (!email) {
    await logAudit({ action: "UNKNOWN_ZOOM_PARTICIPANT", entity: "ClassSession", entityId: cs.id, metadata: { reason: "no_email", name: p.user_name } });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email }, include: { studentProfile: true } });
  if (!user?.studentProfile) {
    await logAudit({ action: "UNKNOWN_ZOOM_PARTICIPANT", entity: "ClassSession", entityId: cs.id, metadata: { email, name: p.user_name } });
    return;
  }
  const enrolled = cs.class.enrollments.some((e) => e.studentId === user.studentProfile!.id);
  if (!enrolled) {
    await logAudit({ action: "UNKNOWN_ZOOM_PARTICIPANT", entity: "ClassSession", entityId: cs.id, metadata: { email, reason: "not_enrolled" } });
    return;
  }
  await prisma.attendance.upsert({
    where: { sessionId_studentId: { sessionId: cs.id, studentId: user.studentProfile.id } },
    create: { sessionId: cs.id, studentId: user.studentProfile.id, status: "PRESENT", joinedAt: new Date() },
    update: { joinedAt: new Date(), status: "PRESENT" },
  });
}

async function handleParticipantLeft(meetingId: string, p: ZoomParticipant) {
  const cs = await findSessionByMeeting(meetingId);
  if (!cs || !p.email) return;
  const user = await prisma.user.findUnique({
    where: { email: p.email.toLowerCase() },
    include: { studentProfile: true },
  });
  if (!user?.studentProfile) return;
  await prisma.attendance.updateMany({
    where: { sessionId: cs.id, studentId: user.studentProfile.id },
    data: { leftAt: new Date() },
  });
}

async function handleMeetingEnded(meetingId: string) {
  const cs = await findSessionByMeeting(meetingId);
  if (!cs) return;
  await prisma.classSession.update({
    where: { id: cs.id },
    data: { status: "COMPLETED", endedAt: new Date() },
  });
  await finalizeSessionAttendance(cs.id);
  // Auto-create a PENDING TeacherEarning for the now-completed session.
  await createEarningForSession(cs.id);
  // Async AI lesson summary — failure-isolated, doesn't block the webhook.
  enqueueLessonSummary(cs.id);

  // Sprint 7B: award class-attended XP to every present/late student.
  // Best-effort; isolated from the rest of the webhook.
  try {
    const { awardXp } = await import("@/lib/gamification/xp");
    const attended = await prisma.attendance.findMany({
      where: { sessionId: cs.id, status: { in: ["PRESENT", "LATE"] } },
      select: { studentId: true },
    });
    for (const a of attended) {
      awardXp({
        studentId: a.studentId,
        reason: "class_attended",
        points: 10,
      }).catch(() => {});
    }
  } catch {}

  // Broadcast session_ended so live banners auto-dismiss + the admin
  // monitor refreshes. Best-effort.
  try {
    const studentProfiles = await prisma.studentProfile.findMany({
      where: { id: { in: cs.class.enrollments.map((e) => e.studentId) } },
      select: { userId: true },
    });
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
      select: { id: true },
    });
    const recipientUserIds = Array.from(
      new Set([
        ...studentProfiles.map((p) => p.userId),
        ...admins.map((a) => a.id),
      ])
    );
    await fanOutSessionEnded(
      {
        sessionId: cs.id,
        classId: cs.classId,
        endedAt: new Date().toISOString(),
      },
      recipientUserIds
    );
    // Legacy per-class channel for any old subscribers.
    await broadcastClassEnded({ classId: cs.classId, sessionId: cs.id });
  } catch (e) {
    console.error("[zoom/webhook] meeting.ended broadcast failed:", e);
  }

  // Notify students marked ABSENT.
  const absent = await prisma.attendance.findMany({
    where: { sessionId: cs.id, status: "ABSENT" },
    include: { student: { include: { user: true } } },
  });
  if (absent.length) {
    await notifyUsers(
      absent.map((a) => a.student.user.id),
      {
        type: "ATTENDANCE_UPDATE",
        title: "Missed class",
        titleAr: "غياب عن حصة",
        message: "You were marked absent for a class session.",
        messageAr: "تم تسجيل غيابك عن إحدى الحصص.",
        link: "/student/progress",
      }
    );
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-zm-signature");
  const timestamp = req.headers.get("x-zm-request-timestamp");
  const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN ?? "";

  let event: ZoomEvent;
  try {
    event = JSON.parse(rawBody) as ZoomEvent;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  // URL validation challenge — Zoom expects an immediate HMAC echo.
  if (event.event === "endpoint.url_validation" && event.payload?.plainToken) {
    return NextResponse.json(buildUrlValidationResponse(event.payload.plainToken, secret));
  }

  // All other events must carry a valid HMAC signature.
  if (!verifyZoomWebhook(rawBody, signature, timestamp, secret)) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  const meetingId = String(event.payload?.object?.id ?? "");

  // Acknowledge fast; do the DB work but keep it lightweight.
  try {
    switch (event.event) {
      case "meeting.started":
        if (meetingId) await handleMeetingStarted(meetingId);
        break;
      case "meeting.ended":
        if (meetingId) await handleMeetingEnded(meetingId);
        break;
      case "meeting.participant_joined":
        if (meetingId && event.payload?.object?.participant) {
          await handleParticipantJoined(meetingId, event.payload.object.participant);
        }
        break;
      case "meeting.participant_left":
        if (meetingId && event.payload?.object?.participant) {
          await handleParticipantLeft(meetingId, event.payload.object.participant);
        }
        break;
      case "recording.completed":
        if (meetingId) {
          const obj = event.payload?.object;
          const file = obj?.recording_files?.find((f) => f.play_url);
          const url = obj?.share_url ?? file?.play_url ?? file?.download_url;
          if (url) {
            const cs = await findSessionByMeeting(meetingId);
            if (cs) {
              await prisma.classSession.update({
                where: { id: cs.id },
                data: { zoomRecordingUrl: url },
              });
              // Try to pull the transcript; if available, store it on
              // the LessonSummary and re-run AI summary with the real
              // transcript context. Best-effort.
              try {
                const transcript = await fetchZoomTranscript(meetingId);
                if (transcript) {
                  await prisma.lessonSummary.upsert({
                    where: { sessionId: cs.id },
                    create: {
                      sessionId: cs.id,
                      transcript,
                      summaryEn: "",
                      summaryAr: "",
                    },
                    update: { transcript },
                  });
                  enqueueLessonSummary(cs.id);
                }
              } catch (e) {
                console.error("[zoom/webhook] transcript fetch failed:", e);
              }
              const studentIds = cs.class.enrollments.map((e) => e.studentId);
              const profiles = await prisma.studentProfile.findMany({
                where: { id: { in: studentIds } },
                select: { userId: true },
              });
              const parentIds = await parentUserIdsForStudents(studentIds);
              await notifyUsers([...profiles.map((p) => p.userId), ...parentIds], {
                type: "SYSTEM_ANNOUNCEMENT",
                title: "Class recording available",
                titleAr: "تسجيل الحصة متاح",
                message: "The recording for your class is now available.",
                messageAr: "أصبح تسجيل حصتك متاحاً الآن.",
                link: `/student/classes`,
              });
            }
          }
        }
        break;
    }
    await logAudit({
      action: "ZOOM_WEBHOOK_RECEIVED",
      entity: "ClassSession",
      metadata: { type: event.event, meetingId },
    });
  } catch (e) {
    console.error("[zoom/webhook]", event.event, e);
    // Still 200 so Zoom doesn't retry-storm; the error is logged.
  }

  return NextResponse.json({ ok: true });
}
