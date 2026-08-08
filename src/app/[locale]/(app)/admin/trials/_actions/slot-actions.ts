"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { HOLDING_STATUSES } from "@/lib/trials/slots";

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0] ?? null;
}

const createSchema = z.object({
  /** yyyy-mm-dd, as typed by the admin — a KSA calendar day. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  /** HH:mm, 24-hour, KSA time. */
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
  durationMinutes: z.coerce.number().int().min(10).max(180),
  capacity: z.coerce.number().int().min(1).max(50),
  note: z.string().max(120).optional().nullable(),
  /** Create this many weekly copies, starting with the date above. */
  repeatWeeks: z.coerce.number().int().min(1).max(12),
});

/**
 * Publish one trial slot, or a weekly run of them.
 *
 * The admin types a KSA wall-clock time; Saudi Arabia has no daylight
 * saving, so `+03:00` converts it exactly and a slot never drifts an hour.
 * Weekly copies exist so keeping the calendar stocked is one action a month
 * rather than one a day — without them, dated slots would be a chore and
 * the page would quietly go empty.
 */
export async function createTrialSlotsAction(
  input: z.infer<typeof createSchema>
): Promise<Result<{ created: number; skipped: number }>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION: " + parsed.error.issues.map((i) => i.message).join(", "),
    };
  }
  const d = parsed.data;

  const first = new Date(`${d.date}T${d.time}:00+03:00`);
  if (Number.isNaN(first.getTime())) return { ok: false, error: "INVALID_DATETIME" };

  let created = 0;
  let skipped = 0;
  for (let week = 0; week < d.repeatWeeks; week++) {
    const startsAt = new Date(first.getTime() + week * 7 * 86_400_000);
    // Publishing a time that has already passed would show a dead option.
    if (startsAt.getTime() <= Date.now()) {
      skipped++;
      continue;
    }
    // Re-running the same form should not double the calendar.
    const clash = await prisma.trialSlot.findFirst({
      where: { startsAt },
      select: { id: true },
    });
    if (clash) {
      skipped++;
      continue;
    }
    await prisma.trialSlot.create({
      data: {
        startsAt,
        durationMinutes: d.durationMinutes,
        capacity: d.capacity,
        note: d.note?.trim() || null,
        createdBy: session.user.id,
      },
    });
    created++;
  }

  await logAudit({
    userId: session.user.id,
    action: "TRIAL_SLOTS_CREATED",
    entity: "TrialSlot",
    metadata: { date: d.date, time: d.time, repeatWeeks: d.repeatWeeks, created, skipped },
    ipAddress: await ip(),
  });

  revalidatePath("/admin/trials");
  return { ok: true, data: { created, skipped } };
}

/** Hide or re-show a slot without touching bookings already made on it. */
export async function toggleTrialSlotAction(id: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const slot = await prisma.trialSlot.findUnique({
    where: { id },
    select: { isActive: true },
  });
  if (!slot) return { ok: false, error: "NOT_FOUND" };

  await prisma.trialSlot.update({
    where: { id },
    data: { isActive: !slot.isActive },
  });
  await logAudit({
    userId: session.user.id,
    action: "TRIAL_SLOT_TOGGLED",
    entity: "TrialSlot",
    entityId: id,
    metadata: { nowActive: !slot.isActive },
    ipAddress: await ip(),
  });
  revalidatePath("/admin/trials");
  return { ok: true, data: null };
}

/**
 * Delete a slot. Refused once someone has booked it — deleting would strand
 * a real person who is expecting a lesson. Hide it instead.
 */
export async function deleteTrialSlotAction(id: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const booked = await prisma.trialRequest.count({
    where: { slotId: id, status: { in: [...HOLDING_STATUSES] } },
  });
  if (booked > 0) {
    return {
      ok: false,
      error: `لا يمكن الحذف — يوجد ${booked} حجز على هذا الموعد. أخفِه بدلاً من ذلك.`,
    };
  }
  await prisma.trialSlot.delete({ where: { id } }).catch(() => null);
  await logAudit({
    userId: session.user.id,
    action: "TRIAL_SLOT_DELETED",
    entity: "TrialSlot",
    entityId: id,
    ipAddress: await ip(),
  });
  revalidatePath("/admin/trials");
  return { ok: true, data: null };
}
