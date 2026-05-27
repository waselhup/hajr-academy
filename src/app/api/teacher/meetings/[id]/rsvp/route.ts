/**
 * Sprint 3 — Teacher RSVP to a meeting.
 *
 * PATCH /api/teacher/meetings/[id]/rsvp  body: { status: "YES"|"NO"|"MAYBE" }
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const VALID = ["YES", "NO", "MAYBE"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.status || !VALID.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const tp = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!tp) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const attendee = await prisma.teacherMeetingAttendee.findUnique({
    where: { meetingId_teacherId: { meetingId: id, teacherId: tp.id } },
  });
  if (!attendee) {
    return NextResponse.json({ error: "Not invited" }, { status: 403 });
  }

  const updated = await prisma.teacherMeetingAttendee.update({
    where: { id: attendee.id },
    data: { rsvpStatus: body.status },
  });

  await audit.mutation(
    session.user.id,
    "MEETING_RSVP",
    "TeacherMeetingAttendee",
    attendee.id,
    { status: body.status }
  );

  return NextResponse.json({ attendee: updated });
}
