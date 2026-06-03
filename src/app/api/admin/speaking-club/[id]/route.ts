/**
 * PATCH /api/admin/speaking-club/[id] — update event
 * DELETE                              — cancel event
 *
 * Attendance update: PATCH with body { attendance: { [studentId]: boolean } }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    titleAr?: string;
    titleEn?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    scheduledAt?: string;
    durationMin?: number;
    maxAttendees?: number;
    minLevel?: string;
    hostTeacherId?: string;
    zoomMeetingId?: string;
    zoomJoinUrl?: string;
    recordingUrl?: string;
    status?: "UPCOMING" | "LIVE" | "ENDED" | "CANCELLED";
    attendance?: Record<string, boolean>;
  };

  if (body.attendance) {
    const updates = Object.entries(body.attendance).map(([studentId, attended]) =>
      prisma.speakingClubRSVP.updateMany({
        where: { eventId: id, studentId },
        data: { attended },
      })
    );
    await Promise.all(updates);
    await audit.mutation(
      session.user.id,
      "SPEAKING_CLUB_ATTENDANCE_MARKED",
      "SpeakingClubEvent",
      id,
      { count: updates.length }
    );
    return NextResponse.json({ ok: true });
  }

  const data: Record<string, unknown> = {};
  if (body.titleAr) data.titleAr = body.titleAr;
  if (body.titleEn) data.titleEn = body.titleEn;
  if (body.descriptionAr !== undefined) data.descriptionAr = body.descriptionAr;
  if (body.descriptionEn !== undefined) data.descriptionEn = body.descriptionEn;
  if (body.scheduledAt) {
    const d = new Date(body.scheduledAt);
    if (!isNaN(d.getTime())) data.scheduledAt = d;
  }
  if (body.durationMin) data.durationMin = body.durationMin;
  if (body.maxAttendees) data.maxAttendees = body.maxAttendees;
  if (body.minLevel !== undefined) data.minLevel = body.minLevel;
  if (body.hostTeacherId !== undefined) data.hostTeacherId = body.hostTeacherId;
  if (body.zoomMeetingId !== undefined) data.zoomMeetingId = body.zoomMeetingId;
  if (body.zoomJoinUrl !== undefined) data.zoomJoinUrl = body.zoomJoinUrl;
  if (body.recordingUrl !== undefined) data.recordingUrl = body.recordingUrl;
  if (body.status) data.status = body.status;

  const updated = await prisma.speakingClubEvent.update({
    where: { id },
    data,
  });
  await audit.mutation(
    session.user.id,
    "SPEAKING_CLUB_UPDATED",
    "SpeakingClubEvent",
    id,
    { fields: Object.keys(data) }
  );
  return NextResponse.json({ ok: true, event: updated });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await ctx.params;
  await prisma.speakingClubEvent.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  await audit.mutation(
    session.user.id,
    "SPEAKING_CLUB_CANCELLED",
    "SpeakingClubEvent",
    id
  );
  return NextResponse.json({ ok: true });
}
