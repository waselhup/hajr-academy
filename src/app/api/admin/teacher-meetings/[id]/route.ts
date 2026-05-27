/**
 * Sprint 3 — Admin meeting detail PATCH (minutes, action items, status, attendance).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import type { MeetingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES: MeetingStatus[] = ["SCHEDULED", "LIVE", "ENDED", "CANCELLED"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  let body: {
    minutes?: string;
    actionItems?: Array<{ text: string; assigneeId?: string; done?: boolean; due?: string }>;
    status?: string;
    attendance?: Record<string, boolean>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const meeting = await prisma.teacherMeeting.findUnique({ where: { id } });
  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.minutes === "string") update.minutes = body.minutes.slice(0, 20000);
  if (Array.isArray(body.actionItems)) update.actionItems = body.actionItems;
  if (body.status && STATUSES.includes(body.status as MeetingStatus)) {
    update.status = body.status;
  }

  const updated = Object.keys(update).length
    ? await prisma.teacherMeeting.update({ where: { id }, data: update })
    : meeting;

  // Attendance toggles.
  if (body.attendance) {
    for (const [attendeeId, attended] of Object.entries(body.attendance)) {
      await prisma.teacherMeetingAttendee.update({
        where: { id: attendeeId },
        data: { attended: Boolean(attended) },
      }).catch(() => null);
    }
  }

  await audit.mutation(
    session.user.id,
    "TEACHER_MEETING_UPDATED",
    "TeacherMeeting",
    id,
    update
  );

  return NextResponse.json({ meeting: updated });
}
