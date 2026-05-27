/**
 * Sprint 3 — Admin teacher meetings list + create.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyMany } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const meetings = await prisma.teacherMeeting.findMany({
    orderBy: { scheduledAt: "desc" },
    include: {
      _count: { select: { attendees: true } },
    },
    take: 100,
  });
  return NextResponse.json({ meetings });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    title?: string;
    titleAr?: string;
    description?: string;
    scheduledAt?: string;
    durationMin?: number;
    agenda?: string;
    agendaAr?: string;
    zoomJoinUrl?: string;
    attendeeTeacherIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const titleAr = String(body.titleAr ?? "").trim();
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;

  if (!title || !titleAr) {
    return NextResponse.json({ error: "Title (AR+EN) required" }, { status: 400 });
  }
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Valid scheduledAt required" }, { status: 400 });
  }

  const durationMin =
    typeof body.durationMin === "number" && body.durationMin > 0 && body.durationMin <= 480
      ? Math.round(body.durationMin)
      : 60;

  const attendeeIds = Array.isArray(body.attendeeTeacherIds)
    ? [...new Set(body.attendeeTeacherIds.map(String))]
    : [];

  // Validate attendees exist.
  const teachers = await prisma.teacherProfile.findMany({
    where: { id: { in: attendeeIds } },
    select: { id: true, userId: true },
  });
  const validIds = teachers.map((t) => t.id);

  // Create a global CalendarEvent for visibility.
  const endAt = new Date(scheduledAt.getTime() + durationMin * 60 * 1000);
  const calEvent = await prisma.calendarEvent.create({
    data: {
      type: "MEETING",
      title,
      titleAr,
      description: body.description ?? null,
      descriptionAr: body.agendaAr ?? null,
      startAt: scheduledAt,
      endAt,
      isGlobal: false,
      audienceRole: "TEACHER",
      createdBy: session.user.id,
      metadata: { meetingType: "teacher-meeting" },
    },
  });

  const meeting = await prisma.teacherMeeting.create({
    data: {
      title,
      titleAr,
      description: body.description ?? null,
      scheduledAt,
      durationMin,
      agenda: body.agenda ?? null,
      agendaAr: body.agendaAr ?? null,
      zoomJoinUrl: body.zoomJoinUrl ?? null,
      calendarEventId: calEvent.id,
      createdById: session.user.id,
      attendees: {
        create: validIds.map((tid) => ({ teacherId: tid })),
      },
    },
    include: { attendees: true },
  });

  await audit.mutation(
    session.user.id,
    "TEACHER_MEETING_CREATED",
    "TeacherMeeting",
    meeting.id,
    { title, scheduledAt: scheduledAt.toISOString(), attendees: validIds.length }
  );

  // Notify all attendee teachers.
  const userIds = teachers.map((t) => t.userId);
  await notifyMany(userIds, {
    type: "SYSTEM_ANNOUNCEMENT",
    title: `Meeting: ${title}`,
    titleAr: `اجتماع: ${titleAr}`,
    body: `Scheduled for ${scheduledAt.toLocaleString()}`,
    bodyAr: `موعد الاجتماع: ${scheduledAt.toLocaleString()}`,
    channels: ["inApp", "email"],
    actionUrl: `/teacher/meetings`,
    priority: "HIGH",
    refType: "TeacherMeeting",
    refId: meeting.id,
  });

  return NextResponse.json({ meeting }, { status: 201 });
}
