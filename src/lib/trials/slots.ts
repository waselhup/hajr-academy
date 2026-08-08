/**
 * Trial-lesson time slots.
 *
 * One module owns both "which slots can still be booked" and "how a slot
 * reads to a human", so the public page, the booking API, the admin screen
 * and the WhatsApp message can never describe the same slot differently.
 *
 * Everything is displayed in Asia/Riyadh regardless of the visitor's device
 * clock — a Saudi academy quoting a Cairo browser its local time is how
 * people miss lessons. Dates are dd/mm/yyyy with Western digits, the
 * platform-wide rule.
 */

import { prisma } from "@/lib/prisma";

export const KSA_TZ = "Asia/Riyadh";

/** Statuses that still hold a seat. A declined request frees its place. */
const HOLDING_STATUSES = ["NEW", "CONTACTED", "SCHEDULED", "COMPLETED", "CONVERTED"] as const;

/** Booking closes this long before a slot starts — nobody books at 16:59
 *  for a 17:00 lesson and expects a teacher to be ready. */
export const BOOKING_CUTOFF_MINUTES = 60;

export interface BookableSlot {
  id: string;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  booked: number;
  remaining: number;
  note: string | null;
  /** "الأحد 10/08/2026" */
  dayLabel: string;
  /** "4:00 – 4:30 م" */
  timeLabel: string;
}

function parts(d: Date, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: KSA_TZ, ...opts }).format(d);
}

const AR_WEEKDAYS: Record<string, string> = {
  Sunday: "الأحد",
  Monday: "الإثنين",
  Tuesday: "الثلاثاء",
  Wednesday: "الأربعاء",
  Thursday: "الخميس",
  Friday: "الجمعة",
  Saturday: "السبت",
};

/** "الأحد 10/08/2026" (ar) or "Sunday 10/08/2026" (en). */
export function dayLabel(startsAt: Date, isAr: boolean): string {
  const weekday = parts(startsAt, { weekday: "long" });
  const date = parts(startsAt, { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${isAr ? AR_WEEKDAYS[weekday] ?? weekday : weekday} ${date}`;
}

/** "4:00 – 4:30 م" (ar) or "4:00 – 4:30 PM" (en), Western digits. */
export function timeLabel(startsAt: Date, durationMinutes: number, isAr: boolean): string {
  const end = new Date(startsAt.getTime() + durationMinutes * 60_000);
  const hhmm = (d: Date) =>
    parts(d, { hour: "numeric", minute: "2-digit", hour12: true })
      .replace(/\s?(AM|am)/, "")
      .replace(/\s?(PM|pm)/, "")
      .trim();
  const meridiem = parts(startsAt, { hour: "numeric", hour12: true }).includes("PM")
    ? isAr ? "م" : "PM"
    : isAr ? "ص" : "AM";
  return `${hhmm(startsAt)} – ${hhmm(end)} ${meridiem}`;
}

/** One line describing a slot, used in messages and admin lists. */
export function slotSummary(
  slot: { startsAt: Date; durationMinutes: number },
  isAr: boolean
): string {
  return `${dayLabel(slot.startsAt, isAr)} · ${timeLabel(slot.startsAt, slot.durationMinutes, isAr)}`;
}

/**
 * Slots a visitor may still book: active, far enough in the future, and not
 * already full. Sorted soonest first.
 */
export async function listBookableSlots(isAr: boolean): Promise<BookableSlot[]> {
  const cutoff = new Date(Date.now() + BOOKING_CUTOFF_MINUTES * 60_000);
  try {
    const slots = await prisma.trialSlot.findMany({
      where: { isActive: true, startsAt: { gte: cutoff } },
      orderBy: { startsAt: "asc" },
      take: 60,
      include: {
        _count: { select: { requests: { where: { status: { in: [...HOLDING_STATUSES] } } } } },
      },
    });

    return slots
      .map((s) => {
        const booked = s._count.requests;
        return {
          id: s.id,
          startsAt: s.startsAt.toISOString(),
          durationMinutes: s.durationMinutes,
          capacity: s.capacity,
          booked,
          remaining: Math.max(0, s.capacity - booked),
          note: s.note,
          dayLabel: dayLabel(s.startsAt, isAr),
          timeLabel: timeLabel(s.startsAt, s.durationMinutes, isAr),
        };
      })
      .filter((s) => s.remaining > 0);
  } catch (e) {
    console.error("[trials] listBookableSlots failed:", e);
    return [];
  }
}

/** Seats already taken on a slot. Used by the booking guard. */
export async function bookedCount(slotId: string): Promise<number> {
  return prisma.trialRequest.count({
    where: { slotId, status: { in: [...HOLDING_STATUSES] } },
  });
}

export { HOLDING_STATUSES };
