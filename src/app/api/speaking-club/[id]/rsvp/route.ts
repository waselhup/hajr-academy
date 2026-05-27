/**
 * POST /api/speaking-club/[id]/rsvp     — student RSVPs
 * DELETE /api/speaking-club/[id]/rsvp   — student cancels RSVP
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function studentIdFor(userId: string): Promise<string | null> {
  const sp = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return sp?.id ?? null;
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("STUDENT");
  const { id } = await ctx.params;
  const studentId = await studentIdFor(session.user.id);
  if (!studentId) {
    return NextResponse.json({ ok: false, error: "no-student-profile" }, { status: 400 });
  }

  const event = await prisma.speakingClubEvent.findUnique({
    where: { id },
    include: { _count: { select: { rsvps: true } } },
  });
  if (!event || event.status === "CANCELLED") {
    return NextResponse.json({ ok: false, error: "event-unavailable" }, { status: 404 });
  }
  if (event._count.rsvps >= event.maxAttendees) {
    return NextResponse.json({ ok: false, error: "event-full" }, { status: 409 });
  }

  const rsvp = await prisma.speakingClubRSVP.upsert({
    where: { eventId_studentId: { eventId: id, studentId } },
    create: { eventId: id, studentId },
    update: {},
  });

  // Calendar event for the student
  try {
    await prisma.calendarEvent.create({
      data: {
        type: "SPEAKING_CLUB",
        title: event.titleEn,
        titleAr: event.titleAr,
        description: event.descriptionEn || null,
        descriptionAr: event.descriptionAr || null,
        startAt: event.scheduledAt,
        endAt: new Date(event.scheduledAt.getTime() + event.durationMin * 60_000),
        studentId,
        metadata: { speakingClubEventId: id },
        createdBy: session.user.id,
      },
    });
  } catch (e) {
    console.error("[rsvp] calendar create failed:", e);
  }

  await audit.mutation(session.user.id, "SPEAKING_CLUB_RSVP", "SpeakingClubRSVP", rsvp.id, {
    eventId: id,
  });

  return NextResponse.json({ ok: true, rsvpId: rsvp.id });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("STUDENT");
  const { id } = await ctx.params;
  const studentId = await studentIdFor(session.user.id);
  if (!studentId) {
    return NextResponse.json({ ok: false, error: "no-student-profile" }, { status: 400 });
  }
  const existing = await prisma.speakingClubRSVP.findUnique({
    where: { eventId_studentId: { eventId: id, studentId } },
  });
  if (!existing) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  await prisma.speakingClubRSVP.delete({ where: { id: existing.id } });
  await audit.mutation(
    session.user.id,
    "SPEAKING_CLUB_RSVP_CANCELLED",
    "SpeakingClubRSVP",
    existing.id,
    { eventId: id }
  );
  return NextResponse.json({ ok: true });
}
