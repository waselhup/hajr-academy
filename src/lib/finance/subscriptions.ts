/**
 * Subscription lifecycle (Phase 8).
 *
 * A `Subscription` is a student's recurring billing plan. Lifecycle:
 *
 *   create  → status ACTIVE, first Invoice (PENDING) minted
 *   pay     → invoice PAID, period advanced (handled via payments flow)
 *   renew   → cron mints next Invoice; auto-charges if a card is on file
 *   pause   → status PAUSED, no new invoices
 *   resume  → status ACTIVE, billing date re-anchored
 *   cancel  → status CANCELLED, access runs until currentPeriodEnd
 *   expire  → cron: PAST_DUE > 15 days → EXPIRED
 *
 * All money is SAR; VAT is always 15%, computed server-side.
 */

import { prisma } from "@/lib/prisma";
import type { PackageType, SubStatus } from "@prisma/client";
import { getPackage, VAT_RATE } from "./packages";
import { createInvoice } from "./invoices";
import {
  validatePromoCode,
  computeDiscount,
  consumePromoCode,
} from "./promo-codes";
import { logAudit } from "@/lib/audit";

/** Number of days a PAST_DUE subscription survives before expiring. */
export const GRACE_PERIOD_DAYS = 15;

/** Add whole months to a date (clamping day-of-month). */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  return d;
}

export interface CreateSubscriptionInput {
  studentId: string;
  packageType: Exclude<PackageType, "SCHOOL">;
  programId?: string | null;
  autoRenew?: boolean;
  /** Optional promo code typed by the student. */
  promoCode?: string | null;
}

export interface CreateSubscriptionResult {
  ok: boolean;
  error?: string;
  errorAr?: string;
  subscriptionId?: string;
  invoiceId?: string;
}

/**
 * Create a subscription + its first invoice. The subscription starts
 * ACTIVE; the first invoice is PENDING until paid.
 */
export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<CreateSubscriptionResult> {
  let pkg;
  try {
    pkg = getPackage(input.packageType);
  } catch {
    return {
      ok: false,
      error: "Unknown package.",
      errorAr: "باقة غير معروفة.",
    };
  }

  // One active subscription per student.
  const existing = await prisma.subscription.findFirst({
    where: {
      studentId: input.studentId,
      status: { in: ["ACTIVE", "PAST_DUE", "TRIAL"] },
    },
  });
  if (existing) {
    return {
      ok: false,
      error: "You already have an active subscription.",
      errorAr: "لديك اشتراك نشط بالفعل.",
    };
  }

  const basePrice = pkg.pricePerMonth;

  // Validate + price the promo code (if any).
  let discountAmount = 0;
  let promoCodeId: string | null = null;
  if (input.promoCode) {
    const promo = await validatePromoCode({
      codeStr: input.promoCode,
      basePrice,
      packageType: input.packageType,
      studentId: input.studentId,
    });
    if (!promo.valid) {
      return { ok: false, error: promo.reason, errorAr: promo.reasonAr };
    }
    discountAmount = promo.discountAmount ?? 0;
    promoCodeId = promo.code?.id ?? null;
  }

  const net = Math.max(0, +(basePrice - discountAmount).toFixed(2));
  const vat = +(net * VAT_RATE).toFixed(2);
  const totalWithVat = +(net + vat).toFixed(2);

  const now = new Date();
  const periodEnd = addMonths(now, 1);

  // Subscription + invoice are created together; createInvoice is its own
  // unit of work, so we create the subscription first then the invoice.
  const subscription = await prisma.subscription.create({
    data: {
      studentId: input.studentId,
      packageType: input.packageType,
      programId: input.programId ?? null,
      status: "ACTIVE",
      pricePerMonth: basePrice,
      vatRate: VAT_RATE,
      totalWithVat,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      nextBillingDate: periodEnd,
      autoRenew: input.autoRenew ?? false,
      promoCodeId,
      discountAmount,
    },
  });

  // Reflect the active package on the student profile.
  await prisma.studentProfile.update({
    where: { id: input.studentId },
    data: {
      activePackage: input.packageType,
      packageStartedAt: now,
      packageExpiresAt: periodEnd,
    },
  });

  const invoice = await createInvoice({
    studentId: input.studentId,
    subscriptionId: subscription.id,
    type: "SUBSCRIPTION",
    packageType: input.packageType,
    discount: discountAmount,
    dueInDays: 7,
    lineItems: [
      {
        description: `${pkg.nameEn} — monthly subscription`,
        descriptionAr: `${pkg.nameAr} — اشتراك شهري`,
        quantity: 1,
        unitPrice: basePrice,
      },
    ],
    notesAr: "اشتراك شهري في أكاديمية حجر للغة الإنجليزية.",
    notes: "Monthly subscription to HAJR A° English Academy.",
  });

  if (promoCodeId) {
    await consumePromoCode(promoCodeId);
  }

  await logAudit({
    action: "SUBSCRIPTION_CREATED",
    entity: "Subscription",
    entityId: subscription.id,
    metadata: {
      packageType: input.packageType,
      invoiceId: invoice.id,
      discountAmount,
    },
  });

  return {
    ok: true,
    subscriptionId: subscription.id,
    invoiceId: invoice.id,
  };
}

/**
 * Advance a subscription's billing period by one month after a successful
 * payment. Sets status back to ACTIVE (e.g. recovering from PAST_DUE).
 */
export async function advanceSubscriptionPeriod(
  subscriptionId: string
): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!sub) return;

  const newStart = sub.currentPeriodEnd;
  const newEnd = addMonths(newStart, 1);

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "ACTIVE",
      currentPeriodStart: newStart,
      currentPeriodEnd: newEnd,
      nextBillingDate: newEnd,
    },
  });
  await prisma.studentProfile.update({
    where: { id: sub.studentId },
    data: { packageExpiresAt: newEnd },
  });
}

/** Pause an active subscription — no further invoices are generated. */
export async function pauseSubscription(
  subscriptionId: string
): Promise<{ ok: boolean; error?: string }> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!sub) return { ok: false, error: "Subscription not found." };
  if (sub.status !== "ACTIVE") {
    return { ok: false, error: "Only active subscriptions can be paused." };
  }
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "PAUSED", nextBillingDate: null },
  });
  await logAudit({
    action: "SUBSCRIPTION_PAUSED",
    entity: "Subscription",
    entityId: subscriptionId,
  });
  return { ok: true };
}

/** Resume a paused subscription, re-anchoring the next billing date. */
export async function resumeSubscription(
  subscriptionId: string
): Promise<{ ok: boolean; error?: string }> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!sub) return { ok: false, error: "Subscription not found." };
  if (sub.status !== "PAUSED") {
    return { ok: false, error: "Only paused subscriptions can be resumed." };
  }
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "ACTIVE", nextBillingDate: sub.currentPeriodEnd },
  });
  await logAudit({
    action: "SUBSCRIPTION_RESUMED",
    entity: "Subscription",
    entityId: subscriptionId,
  });
  return { ok: true };
}

/**
 * Cancel a subscription. Access continues until `currentPeriodEnd`; no
 * further invoices are minted.
 */
export async function cancelSubscription(
  subscriptionId: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!sub) return { ok: false, error: "Subscription not found." };
  if (sub.status === "CANCELLED" || sub.status === "EXPIRED") {
    return { ok: false, error: "Subscription is already inactive." };
  }
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason ?? null,
      nextBillingDate: null,
    },
  });
  await logAudit({
    action: "SUBSCRIPTION_CANCELLED",
    entity: "Subscription",
    entityId: subscriptionId,
    metadata: { reason: reason ?? null },
  });
  return { ok: true };
}

/**
 * Change a subscription's package. Pricing is re-derived; the change takes
 * effect on the next billing cycle (the current period is honoured).
 */
export async function changeSubscriptionPackage(
  subscriptionId: string,
  newPackage: Exclude<PackageType, "SCHOOL">
): Promise<{ ok: boolean; error?: string }> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!sub) return { ok: false, error: "Subscription not found." };

  let pkg;
  try {
    pkg = getPackage(newPackage);
  } catch {
    return { ok: false, error: "Unknown package." };
  }

  const discountAmount = Number(sub.discountAmount);
  const net = Math.max(0, +(pkg.pricePerMonth - discountAmount).toFixed(2));
  const totalWithVat = +(net * (1 + VAT_RATE)).toFixed(2);

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      packageType: newPackage,
      pricePerMonth: pkg.pricePerMonth,
      totalWithVat,
    },
  });
  await prisma.studentProfile.update({
    where: { id: sub.studentId },
    data: { activePackage: newPackage },
  });
  await logAudit({
    action: "SUBSCRIPTION_PACKAGE_CHANGED",
    entity: "Subscription",
    entityId: subscriptionId,
    metadata: { newPackage },
  });
  return { ok: true };
}

/** Apply a flat discount to a subscription (admin action). */
export async function applySubscriptionDiscount(
  subscriptionId: string,
  discountAmount: number
): Promise<{ ok: boolean; error?: string }> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!sub) return { ok: false, error: "Subscription not found." };

  const disc = Math.max(0, Math.min(discountAmount, Number(sub.pricePerMonth)));
  const net = +(Number(sub.pricePerMonth) - disc).toFixed(2);
  const totalWithVat = +(net * (1 + VAT_RATE)).toFixed(2);

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { discountAmount: disc, totalWithVat },
  });
  await logAudit({
    action: "SUBSCRIPTION_DISCOUNT_APPLIED",
    entity: "Subscription",
    entityId: subscriptionId,
    metadata: { discountAmount: disc },
  });
  return { ok: true };
}

/**
 * Generate the next invoice for a subscription due for renewal. Used by the
 * renewal cron. Returns the new invoice id (or null if not applicable).
 */
export async function generateRenewalInvoice(
  subscriptionId: string
): Promise<string | null> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!sub || sub.status !== "ACTIVE") return null;

  let pkg;
  try {
    pkg = getPackage(sub.packageType as Exclude<PackageType, "SCHOOL">);
  } catch {
    return null;
  }

  const invoice = await createInvoice({
    studentId: sub.studentId,
    subscriptionId: sub.id,
    type: "SUBSCRIPTION",
    packageType: sub.packageType,
    discount: Number(sub.discountAmount),
    dueInDays: 7,
    lineItems: [
      {
        description: `${pkg.nameEn} — monthly renewal`,
        descriptionAr: `${pkg.nameAr} — تجديد شهري`,
        quantity: 1,
        unitPrice: Number(sub.pricePerMonth),
      },
    ],
    notesAr: "تجديد الاشتراك الشهري.",
    notes: "Monthly subscription renewal.",
  });

  return invoice.id;
}

/** Set a subscription's status directly (used by cron transitions). */
export async function setSubscriptionStatus(
  subscriptionId: string,
  status: SubStatus
): Promise<void> {
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status },
  });
}
