/**
 * Promo-code validation and discount calculation.
 *
 * Validation is always server-side: expiry window, active flag, global +
 * per-user usage caps, and package/program applicability are all checked
 * here. `validatePromoCode` is safe to call from public-facing routes.
 */

import { prisma } from "@/lib/prisma";
import type { PromoCode } from "@prisma/client";

export interface PromoValidationResult {
  valid: boolean;
  reason?: string;
  reasonAr?: string;
  code?: PromoCode;
  /** Discount in SAR for the supplied base price. */
  discountAmount?: number;
  /** Number of free months (FREE_MONTHS type only). */
  freeMonths?: number;
}

/**
 * Validate a promo code for a given package + base monthly price.
 *
 * @param codeStr   raw code as typed by the user (case-insensitive)
 * @param basePrice pre-VAT monthly price the discount applies against
 * @param packageType package being subscribed to (for applicability)
 * @param studentId optional — enables the per-user usage-cap check
 */
export async function validatePromoCode(params: {
  codeStr: string;
  basePrice: number;
  packageType?: string;
  studentId?: string;
}): Promise<PromoValidationResult> {
  const code = (params.codeStr ?? "").trim().toUpperCase();
  if (!code) {
    return {
      valid: false,
      reason: "Enter a promo code.",
      reasonAr: "أدخل رمز الخصم.",
    };
  }

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo) {
    return {
      valid: false,
      reason: "Invalid promo code.",
      reasonAr: "رمز الخصم غير صحيح.",
    };
  }

  if (!promo.isActive) {
    return {
      valid: false,
      reason: "This promo code is no longer active.",
      reasonAr: "رمز الخصم لم يعد فعّالاً.",
    };
  }

  const now = new Date();
  if (promo.startsAt > now) {
    return {
      valid: false,
      reason: "This promo code is not active yet.",
      reasonAr: "رمز الخصم لم يبدأ بعد.",
    };
  }
  if (promo.expiresAt && promo.expiresAt < now) {
    return {
      valid: false,
      reason: "This promo code has expired.",
      reasonAr: "انتهت صلاحية رمز الخصم.",
    };
  }

  // Global usage cap.
  if (promo.maxUses != null && promo.currentUses >= promo.maxUses) {
    return {
      valid: false,
      reason: "This promo code has reached its usage limit.",
      reasonAr: "تم استنفاد الحد الأقصى لاستخدام رمز الخصم.",
    };
  }

  // Per-user usage cap (counts subscriptions that used this code).
  if (params.studentId) {
    const usedByUser = await prisma.subscription.count({
      where: { studentId: params.studentId, promoCodeId: promo.id },
    });
    if (usedByUser >= promo.maxUsesPerUser) {
      return {
        valid: false,
        reason: "You have already used this promo code.",
        reasonAr: "لقد استخدمت رمز الخصم هذا مسبقاً.",
      };
    }
  }

  // Package applicability (empty list = all packages).
  if (
    params.packageType &&
    promo.applicablePackages.length > 0 &&
    !promo.applicablePackages.includes(
      params.packageType as (typeof promo.applicablePackages)[number]
    )
  ) {
    return {
      valid: false,
      reason: "This promo code does not apply to the selected package.",
      reasonAr: "رمز الخصم لا ينطبق على الباقة المختارة.",
    };
  }

  // Compute the discount.
  const { discountAmount, freeMonths } = computeDiscount(
    promo,
    params.basePrice
  );

  return { valid: true, code: promo, discountAmount, freeMonths };
}

/** Compute the SAR discount (and free months) a promo yields on a price. */
export function computeDiscount(
  promo: Pick<PromoCode, "type" | "value">,
  basePrice: number
): { discountAmount: number; freeMonths: number } {
  const value = Number(promo.value);
  if (promo.type === "PERCENTAGE") {
    const pct = Math.min(Math.max(value, 0), 100);
    return {
      discountAmount: +((basePrice * pct) / 100).toFixed(2),
      freeMonths: 0,
    };
  }
  if (promo.type === "FIXED_AMOUNT") {
    return {
      discountAmount: +Math.min(value, basePrice).toFixed(2),
      freeMonths: 0,
    };
  }
  // FREE_MONTHS — first invoice is fully discounted; `value` = month count.
  return { discountAmount: +basePrice.toFixed(2), freeMonths: Math.floor(value) };
}

/** Atomically increment a promo code's usage counter. */
export async function consumePromoCode(promoCodeId: string): Promise<void> {
  await prisma.promoCode.update({
    where: { id: promoCodeId },
    data: { currentUses: { increment: 1 } },
  });
}
