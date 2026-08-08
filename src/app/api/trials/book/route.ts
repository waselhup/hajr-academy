import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { ipFromHeaders, shortHash } from "@/lib/analytics/hashing";
import {
  BOOKING_CUTOFF_MINUTES,
  HOLDING_STATUSES,
  slotSummary,
} from "@/lib/trials/slots";

export const dynamic = "force-dynamic";

/**
 * POST /api/trials/book — a visitor books a free trial lesson.
 *
 * The visitor picks one of the times the admin published; nothing here
 * accepts a free-typed time, so the academy is never committed to a slot it
 * did not offer. Public and unauthenticated, so it is rate-limited: without
 * that it is a way to notify every admin on demand.
 */

const schema = z.object({
  name: z.string().min(2).max(100),
  phone: z
    .string()
    .regex(/^(\+966|05)\d{8,}$/, "Phone must start with 05 or +966"),
  email: z.string().email().optional().or(z.literal("")),
  slotId: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const ipHash = shortHash(ipFromHeaders(req.headers) ?? "");
  const rl = rateLimit(`trial-book:${ipHash || "anon"}`, 5, 30 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error:
          "محاولات كثيرة. حاول بعد قليل. / Too many attempts, please try again shortly.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      }
    );
  }

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const slot = await prisma.trialSlot.findUnique({ where: { id: d.slotId } });
    if (!slot || !slot.isActive) {
      return NextResponse.json(
        {
          error:
            "هذا الموعد لم يعد متاحاً. اختر موعداً آخر. / That time is no longer available — please pick another.",
          slotGone: true,
        },
        { status: 409 }
      );
    }
    if (slot.startsAt.getTime() < Date.now() + BOOKING_CUTOFF_MINUTES * 60_000) {
      return NextResponse.json(
        {
          error:
            "انتهى وقت الحجز لهذا الموعد. اختر موعداً آخر. / Booking has closed for that time — please pick another.",
          slotGone: true,
        },
        { status: 409 }
      );
    }

    // Same person, same slot, twice — usually a double tap or a refresh.
    // Return the original booking rather than a second one.
    const already = await prisma.trialRequest.findFirst({
      where: { slotId: slot.id, phone: d.phone, status: { in: [...HOLDING_STATUSES] } },
      select: { id: true },
    });
    if (already) {
      return NextResponse.json({
        success: true,
        id: already.id,
        duplicate: true,
        slot: {
          ar: slotSummary(slot, true),
          en: slotSummary(slot, false),
        },
      });
    }

    // Capacity is checked and the booking created in one transaction. Two
    // requests landing in the same millisecond could still both pass under
    // read-committed; the overflow is logged rather than hidden, and an
    // admin sees both requests on the slot.
    const created = await prisma.$transaction(async (tx) => {
      const taken = await tx.trialRequest.count({
        where: { slotId: slot.id, status: { in: [...HOLDING_STATUSES] } },
      });
      if (taken >= slot.capacity) return null;
      return tx.trialRequest.create({
        data: {
          name: d.name,
          phone: d.phone,
          email: d.email || null,
          slotId: slot.id,
          // Denormalised so the admin list reads correctly even if the slot
          // is later edited or removed.
          preferredTime: slotSummary(slot, true),
          notes: d.notes || null,
          source: "trial_page",
        },
        select: { id: true },
      });
    });

    if (!created) {
      return NextResponse.json(
        {
          error:
            "اكتمل هذا الموعد للتو. اختر موعداً آخر. / That time just filled up — please pick another.",
          slotGone: true,
        },
        { status: 409 }
      );
    }

    const admins = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
      select: { id: true },
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: "TRIAL_REQUEST" as const,
          title: `Trial booked — ${d.name}`,
          titleAr: `حجز حصة تجريبية — ${d.name}`,
          body: `${slotSummary(slot, false)} · ${d.phone}`,
          bodyAr: `${slotSummary(slot, true)} · ${d.phone}`,
          actionUrl: "/admin/trials",
          actionLabel: "View request",
          actionLabelAr: "عرض الطلب",
          priority: "HIGH" as const,
          refType: "TrialRequest",
          refId: created.id,
        })),
      });
    }

    try {
      const { triggerTrialRequestReceived } = await import("@/lib/comms/triggers");
      await triggerTrialRequestReceived(created.id);
    } catch (e) {
      console.error("[trials/book] dispatch failed:", e);
    }

    await logAudit({
      action: "TRIAL_BOOKED",
      entity: "TrialRequest",
      entityId: created.id,
      metadata: { slotId: slot.id, startsAt: slot.startsAt.toISOString(), name: d.name },
    });

    return NextResponse.json({
      success: true,
      id: created.id,
      slot: {
        ar: slotSummary(slot, true),
        en: slotSummary(slot, false),
      },
    });
  } catch (e) {
    console.error("[trials/book] failed:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
