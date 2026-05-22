import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVideoProvider } from "@/lib/video";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z
  .object({
    classSessionId: z.string().optional(),
    privateLessonId: z.string().optional(),
  })
  .refine((d) => !!d.classSessionId !== !!d.privateLessonId, {
    message: "Provide exactly one of classSessionId or privateLessonId",
  });

function randomPasscode() {
  return Math.random().toString(36).slice(2, 8);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "INVALID_INPUT", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const provider = getVideoProvider();
  const hostEmail = process.env.ZOOM_HOST_EMAIL ?? "";
  if (!hostEmail) {
    return NextResponse.json({ ok: false, error: "ZOOM_HOST_NOT_CONFIGURED" }, { status: 500 });
  }

  try {
    // ─── Class session ───
    if (parsed.data.classSessionId) {
      const cs = await prisma.classSession.findUnique({
        where: { id: parsed.data.classSessionId },
        include: { class: { include: { teacher: true, program: true } } },
      });
      if (!cs) return NextResponse.json({ ok: false, error: "SESSION_NOT_FOUND" }, { status: 404 });

      // Teacher may only start their own class.
      if (session.user.role === "TEACHER") {
        const tp = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
        if (!tp || tp.id !== cs.class.teacherId) {
          return NextResponse.json({ ok: false, error: "NOT_YOUR_CLASS" }, { status: 403 });
        }
      }

      // Already created — return existing details (idempotent).
      if (cs.zoomMeetingId) {
        return NextResponse.json({
          ok: true,
          data: { meetingId: cs.zoomMeetingId, sessionId: cs.id, reused: true },
        });
      }

      const passcode = randomPasscode();
      const meeting = await provider.createMeeting({
        topic: `${cs.class.nameAr ?? cs.class.name} — ${cs.class.cohortCode}`,
        scheduledFor: cs.scheduledDate,
        durationMinutes: cs.class.durationMinutes,
        hostEmail,
        password: passcode,
        autoRecording: true,
      });

      // Persist the passcode Zoom actually assigned (it may normalise ours)
      // so the classroom join can supply the correct password.
      await prisma.classSession.update({
        where: { id: cs.id },
        data: {
          zoomMeetingId: meeting.meetingId,
          zoomJoinUrl: meeting.joinUrl,
          zoomPassword: meeting.password ?? passcode,
        },
      });

      await logAudit({
        userId: session.user.id,
        action: "ZOOM_MEETING_CREATED",
        entity: "ClassSession",
        entityId: cs.id,
        metadata: { meetingId: meeting.meetingId, classId: cs.classId },
      });

      return NextResponse.json({
        ok: true,
        data: { meetingId: meeting.meetingId, sessionId: cs.id },
      });
    }

    // ─── Private lesson ───
    const pl = await prisma.privateLesson.findUnique({
      where: { id: parsed.data.privateLessonId! },
      include: { teacher: true, student: { include: { user: true } } },
    });
    if (!pl) return NextResponse.json({ ok: false, error: "LESSON_NOT_FOUND" }, { status: 404 });

    if (session.user.role === "TEACHER") {
      const tp = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
      if (!tp || tp.id !== pl.teacherId) {
        return NextResponse.json({ ok: false, error: "NOT_YOUR_LESSON" }, { status: 403 });
      }
    }

    if (pl.zoomMeetingId) {
      return NextResponse.json({
        ok: true,
        data: { meetingId: pl.zoomMeetingId, privateLessonId: pl.id, reused: true },
      });
    }

    const passcode = randomPasscode();
    const meeting = await provider.createMeeting({
      topic: `Private Lesson — ${pl.student.user.name}`,
      scheduledFor: pl.scheduledAt,
      durationMinutes: pl.durationMinutes,
      hostEmail,
      password: passcode,
      autoRecording: false,
    });

    await prisma.privateLesson.update({
      where: { id: pl.id },
      data: {
        zoomMeetingId: meeting.meetingId,
        zoomPassword: meeting.password ?? passcode,
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "ZOOM_MEETING_CREATED",
      entity: "PrivateLesson",
      entityId: pl.id,
      metadata: { meetingId: meeting.meetingId },
    });

    return NextResponse.json({
      ok: true,
      data: { meetingId: meeting.meetingId, privateLessonId: pl.id },
    });
  } catch (e) {
    console.error("[zoom/create-meeting]", e);
    return NextResponse.json(
      { ok: false, error: "ZOOM_ERROR", message: (e as Error).message },
      { status: 502 }
    );
  }
}
