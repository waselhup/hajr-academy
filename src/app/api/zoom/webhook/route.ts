import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyZoomWebhook, buildUrlValidationResponse } from "@/lib/video/zoom-webhook";
import { finalizeSessionAttendance } from "@/lib/attendance";
import { logAudit } from "@/lib/audit";
import { notifyUsers, parentUserIdsForStudents } from "@/lib/notify";

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
        if (meetingId) {
          const cs = await findSessionByMeeting(meetingId);
          if (cs) {
            await prisma.classSession.update({
              where: { id: cs.id },
              data: { status: "LIVE", startedAt: new Date() },
            });
            // Notify enrolled students who haven't joined yet.
            const studentIds = cs.class.enrollments.map((e) => e.studentId);
            const profiles = await prisma.studentProfile.findMany({
              where: { id: { in: studentIds } },
              select: { userId: true },
            });
            await notifyUsers(profiles.map((p) => p.userId), {
              type: "CLASS_STARTING",
              title: "Class started",
              titleAr: "بدأت الحصة",
              message: "Your class has started — join now.",
              messageAr: "بدأت حصتك — انضم الآن.",
              link: `/classroom/${cs.id}`,
            });
          }
        }
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
