import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { ipFromHeaders, shortHash } from "@/lib/analytics/hashing";
import { markConversion } from "@/lib/analytics/conversion";
import { trialReference } from "@/lib/trials/reference";

export const dynamic = "force-dynamic";

/**
 * POST /api/trials/request — a trial lesson asked for from the landing page.
 *
 * Distinct from /api/trials/book on purpose. That route is the calendar flow:
 * the visitor picks one of the dated slots an admin published, and capacity
 * and the booking cutoff are enforced against it. It cannot run without a
 * slot, so it is useless the moment the calendar is empty — which is most of
 * the time.
 *
 * This one asks for the four things the academy actually needs to call a
 * family back (full name, grade, age, WhatsApp number) and books nothing. The
 * time is agreed in the WhatsApp conversation that follows. That conversation
 * is the point: the visitor sends the first message, which opens a thread the
 * academy is free to reply to.
 *
 * Public and unauthenticated, so it is rate-limited — without that it is a
 * button that notifies every admin on demand.
 */

const schema = z.object({
  // Three parts, because "Mohammed" does not identify a student in a class of
  // thirty. Enforced by word count rather than length so a long single name
  // cannot pass.
  studentName: z
    .string()
    .trim()
    .min(5)
    .max(120)
    .refine((v) => v.split(/\s+/).filter(Boolean).length >= 3, {
      message: "الرجاء كتابة الاسم الثلاثي. / Please enter the full three-part name.",
    }),
  grade: z.string().trim().min(1).max(40),
  age: z.coerce.number().int().min(3).max(80),
  // The number the academy will message on WhatsApp — Saudi format, same rule
  // as the rest of the public forms.
  whatsapp: z
    .string()
    .trim()
    .regex(/^(\+966|05)\d{8,}$/, "رقم واتساب غير صحيح / Invalid WhatsApp number"),
});

export async function POST(req: Request) {
  const ipHash = shortHash(ipFromHeaders(req.headers) ?? "");
  const rl = rateLimit(`trial-request:${ipHash || "anon"}`, 5, 30 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "محاولات كثيرة. حاول بعد قليل. / Too many attempts, please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation failed" },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const created = await prisma.trialRequest.create({
      data: {
        name: d.studentName,
        phone: d.whatsapp,
        childGrade: d.grade,
        childAge: d.age,
        // No slot: the time is agreed on WhatsApp. `slotId` is nullable
        // precisely so a request can exist before a time does.
        source: "landing_trial",
      },
      select: { id: true, createdAt: true },
    });

    const reference = trialReference(created.id);

    const admins = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
      select: { id: true },
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: "TRIAL_REQUEST" as const,
          title: `Trial request ${reference} — ${d.studentName}`,
          titleAr: `طلب حصة تجريبية ${reference} — ${d.studentName}`,
          body: `Grade ${d.grade} · age ${d.age} · WhatsApp ${d.whatsapp}`,
          bodyAr: `الصف ${d.grade} · العمر ${d.age} · واتساب ${d.whatsapp}`,
          actionUrl: "/admin/trials",
          actionLabel: "View request",
          actionLabelAr: "عرض الطلب",
          priority: "HIGH" as const,
          refType: "TrialRequest",
          refId: created.id,
        })),
      });
    }

    await logAudit({
      action: "TRIAL_REQUESTED",
      entity: "TrialRequest",
      entityId: created.id,
      metadata: { reference, grade: d.grade, age: d.age, source: "landing_trial" },
    });

    // The trial is what the landing page is for, so it is the conversion a
    // campaign should be judged on. No value: the trial is free, and revenue
    // only appears later if the family enrols.
    await markConversion({ type: "TRIAL_BOOKED" });

    return NextResponse.json({ success: true, id: created.id, reference });
  } catch (err) {
    console.error("[trials/request] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
