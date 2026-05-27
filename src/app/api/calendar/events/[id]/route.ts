import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { canModifyEvent } from "@/lib/calendar";
import type { CalendarEventType, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const EVENT_TYPES: CalendarEventType[] = [
  "CLASS",
  "EXAM",
  "HOLIDAY",
  "MEETING",
  "PAYMENT_DUE",
  "PLACEMENT_TEST",
  "SPEAKING_CLUB",
  "DEADLINE",
  "CUSTOM",
];

const updateSchema = z.object({
  type: z.enum(EVENT_TYPES as [string, ...string[]]).optional(),
  title: z.string().min(1).max(200).optional(),
  titleAr: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  descriptionAr: z.string().max(2000).optional().nullable(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  allDay: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canModifyEvent(existing, session.user.id, session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.calendarEvent.update({
    where: { id },
    data: parsed.data as Prisma.CalendarEventUpdateInput,
  });

  await audit.mutation(
    session.user.id,
    "CALENDAR_EVENT_UPDATED",
    "CalendarEvent",
    id,
    parsed.data as Record<string, unknown>
  );

  return NextResponse.json({ event: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canModifyEvent(existing, session.user.id, session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.calendarEvent.delete({ where: { id } });

  await audit.mutation(
    session.user.id,
    "CALENDAR_EVENT_DELETED",
    "CalendarEvent",
    id,
    { type: existing.type }
  );

  return NextResponse.json({ ok: true });
}
