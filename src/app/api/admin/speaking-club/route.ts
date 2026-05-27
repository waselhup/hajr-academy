/**
 * POST /api/admin/speaking-club — create new event
 * GET  /api/admin/speaking-club — list events
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireRole("ADMIN");
  const events = await prisma.speakingClubEvent.findMany({
    orderBy: { scheduledAt: "desc" },
    include: {
      hostTeacher: { include: { user: { select: { name: true } } } },
      _count: { select: { rsvps: true } },
    },
  });
  return NextResponse.json({ ok: true, events });
}

export async function POST(req: NextRequest) {
  const session = await requireRole("ADMIN");
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
  };
  if (!body.titleAr || !body.titleEn || !body.scheduledAt) {
    return NextResponse.json(
      { ok: false, error: "titleAr, titleEn, scheduledAt required" },
      { status: 400 }
    );
  }
  const scheduledAt = new Date(body.scheduledAt);
  if (isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ ok: false, error: "invalid date" }, { status: 400 });
  }
  const durationMin = body.durationMin ?? 60;
  const endAt = new Date(scheduledAt.getTime() + durationMin * 60_000);

  const event = await prisma.speakingClubEvent.create({
    data: {
      titleAr: body.titleAr,
      titleEn: body.titleEn,
      descriptionAr: body.descriptionAr ?? null,
      descriptionEn: body.descriptionEn ?? null,
      scheduledAt,
      durationMin,
      maxAttendees: body.maxAttendees ?? 30,
      minLevel: body.minLevel ?? null,
      hostTeacherId: body.hostTeacherId ?? null,
      zoomMeetingId: body.zoomMeetingId ?? null,
      zoomJoinUrl: body.zoomJoinUrl ?? null,
      createdById: session.user.id,
    },
  });

  // Create a global student calendar event
  try {
    const cal = await prisma.calendarEvent.create({
      data: {
        type: "SPEAKING_CLUB",
        title: body.titleEn,
        titleAr: body.titleAr,
        description: body.descriptionEn ?? null,
        descriptionAr: body.descriptionAr ?? null,
        startAt: scheduledAt,
        endAt,
        audienceRole: "STUDENT",
        isGlobal: true,
        metadata: { speakingClubEventId: event.id },
        createdBy: session.user.id,
      },
    });
    await prisma.speakingClubEvent.update({
      where: { id: event.id },
      data: { calendarEventId: cal.id },
    });
  } catch (e) {
    console.error("[speaking-club:create] calendar event failed:", e);
  }

  // Notify all eligible students (in-app)
  try {
    const students = await prisma.studentProfile.findMany({
      where: { user: { isActive: true } },
      select: { userId: true },
    });
    await Promise.allSettled(
      students.map((s) =>
        notify({
          userId: s.userId,
          type: "SPEAKING_CLUB_CREATED",
          title: `New Speaking Club: ${body.titleEn}`,
          titleAr: `نادي محادثة جديد: ${body.titleAr}`,
          body: `Join us on ${scheduledAt.toISOString().slice(0, 10)} at ${scheduledAt
            .toISOString()
            .slice(11, 16)}`,
          bodyAr: `انضم إلينا في ${scheduledAt.toISOString().slice(0, 10)}`,
          channels: ["inApp"],
          actionUrl: `/ar/student/speaking-club`,
          actionLabel: "View",
          actionLabelAr: "عرض",
          priority: "NORMAL",
          refType: "SpeakingClubEvent",
          refId: event.id,
        })
      )
    );
  } catch (e) {
    console.error("[speaking-club:create] notify failed:", e);
  }

  await audit.mutation(
    session.user.id,
    "SPEAKING_CLUB_CREATED",
    "SpeakingClubEvent",
    event.id,
    { titleEn: body.titleEn }
  );

  return NextResponse.json({ ok: true, event });
}
