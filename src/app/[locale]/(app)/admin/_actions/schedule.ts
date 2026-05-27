"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { upsertSessionCalendarEvent } from "@/lib/calendar";
import type { DayOfWeek } from "@prisma/client";

const DAY_INDEX: Record<DayOfWeek, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

const schema = z.object({
  classId: z.string(),
  weeksAhead: z.coerce.number().int().min(1).max(52).default(12),
  startFrom: z.string().optional(),
});

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0] ?? null;
}

export async function generateSessionsAction(input: z.infer<typeof schema>): Promise<Result<{ created: number }>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };

  const cls = await prisma.class.findUnique({
    where: { id: parsed.data.classId },
    select: {
      scheduleDays: true,
      timeSlot: true,
      durationMinutes: true,
      startDate: true,
      endDate: true,
      name: true,
      nameAr: true,
      teacherId: true,
    },
  });
  if (!cls) return { ok: false, error: "NOT_FOUND" };

  const start = parsed.data.startFrom ? new Date(parsed.data.startFrom) : new Date();
  start.setHours(0, 0, 0, 0);
  const endLimit = new Date(start.getTime() + parsed.data.weeksAhead * 7 * 86400_000);

  const [hh, mm] = cls.timeSlot.split(":").map((n) => parseInt(n, 10));
  const targetIndices = cls.scheduleDays.map((d) => DAY_INDEX[d]);

  const existingSessions = await prisma.classSession.findMany({
    where: { classId: parsed.data.classId, scheduledDate: { gte: start, lte: endLimit } },
    select: { scheduledDate: true },
  });
  const existingSet = new Set(existingSessions.map((s) => s.scheduledDate.toISOString().slice(0, 13)));

  const toCreate: { classId: string; scheduledDate: Date }[] = [];
  for (let d = new Date(start); d <= endLimit; d = new Date(d.getTime() + 86400_000)) {
    if (!targetIndices.includes(d.getDay())) continue;
    const occurrence = new Date(d);
    occurrence.setHours(hh, mm, 0, 0);
    if (existingSet.has(occurrence.toISOString().slice(0, 13))) continue;
    if (cls.endDate && occurrence > cls.endDate) continue;
    toCreate.push({ classId: parsed.data.classId, scheduledDate: occurrence });
  }

  if (toCreate.length) {
    await prisma.classSession.createMany({ data: toCreate });
    // Sprint 3 — mirror each new session as a CalendarEvent so it shows up
    // in /calendar for teacher/students/parents without a manual sync step.
    const createdSessions = await prisma.classSession.findMany({
      where: {
        classId: parsed.data.classId,
        scheduledDate: { in: toCreate.map((c) => c.scheduledDate) },
      },
      select: { id: true, scheduledDate: true },
    });
    for (const s of createdSessions) {
      await upsertSessionCalendarEvent({
        sessionId: s.id,
        classId: parsed.data.classId,
        className: cls.name,
        classNameAr: cls.nameAr,
        teacherId: cls.teacherId,
        scheduledDate: s.scheduledDate,
        durationMinutes: cls.durationMinutes ?? 60,
        createdBy: session.user.id,
      }).catch((e) => console.warn("[schedule] cal upsert failed", e));
    }
  }

  await logAudit({
    userId: session.user.id,
    action: "SESSIONS_GENERATED",
    entity: "Class",
    entityId: parsed.data.classId,
    metadata: { count: toCreate.length, weeksAhead: parsed.data.weeksAhead },
    ipAddress: await ip(),
  });
  revalidatePath("/admin/schedule");
  revalidatePath(`/admin/classes/${parsed.data.classId}`);
  return { ok: true, data: { created: toCreate.length } };
}
