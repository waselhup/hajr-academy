/**
 * Success-partner referrals.
 *
 * A partner (charity, school or individual sponsor) is given ONE discount
 * code. Anyone who buys with that code is recorded as having come through
 * that partner, and the partner earns a percentage of that person's FIRST
 * purchase. Later purchases by the same student are still attributed — so
 * the admin can see the relationship — but earn nothing, which is what
 * "a share of the first month" means.
 *
 * The commission is FROZEN onto the order at settlement. Changing a
 * partner's rate afterwards must never rewrite what was already earned.
 */

import { prisma } from "@/lib/prisma";

export interface ReferralAttribution {
  partnerSchoolId: string | null;
  /** SAR owed to the partner for this order. 0 on repeat purchases. */
  commissionSar: number;
  /** True when this purchase is what tied the student to the partner. */
  isFirstPurchase: boolean;
}

const NONE: ReferralAttribution = {
  partnerSchoolId: null,
  commissionSar: 0,
  isFirstPurchase: false,
};

/**
 * Resolve a paid order's promo code to the partner who owns it, work out the
 * commission, and tie the student to that partner.
 *
 * Never throws: this runs inside settlement, where a failure must not cost
 * the customer their account. Returns NONE if anything is off.
 */
export async function attributeReferral(params: {
  promoCode: string | null;
  /** Gross SAR actually charged. */
  amountSar: number;
  /** StudentProfile.id of the buyer. */
  studentProfileId: string;
}): Promise<ReferralAttribution> {
  const code = (params.promoCode ?? "").trim().toUpperCase();
  if (!code) return NONE;

  try {
    const promo = await prisma.promoCode.findUnique({
      where: { code },
      select: {
        partnerSchool: {
          select: { id: true, active: true, commissionPercent: true },
        },
      },
    });
    const partner = promo?.partnerSchool;
    // A plain marketing code has no partner — nothing to attribute.
    if (!partner) return NONE;

    const student = await prisma.studentProfile.findUnique({
      where: { id: params.studentProfileId },
      select: { schoolId: true },
    });
    if (!student) return NONE;

    // Already tied to a partner (this one or another): the first-purchase
    // commission has been earned once and is not payable again.
    const isFirstPurchase = student.schoolId == null;

    if (isFirstPurchase) {
      // Guard on schoolId still being null so two concurrent settlements for
      // the same buyer cannot both count as "the first".
      const claimed = await prisma.studentProfile.updateMany({
        where: { id: params.studentProfileId, schoolId: null },
        data: { schoolId: partner.id },
      });
      if (claimed.count === 0) {
        return { partnerSchoolId: partner.id, commissionSar: 0, isFirstPurchase: false };
      }
    }

    // An inactive partner keeps the attribution (the code was theirs) but
    // stops earning — deactivating is how the owner ends the arrangement.
    const rate = partner.active ? Number(partner.commissionPercent) : 0;
    const commissionSar =
      isFirstPurchase && rate > 0
        ? +((params.amountSar * rate) / 100).toFixed(2)
        : 0;

    return { partnerSchoolId: partner.id, commissionSar, isFirstPurchase };
  } catch (e) {
    console.error("[partner-referrals] attribution failed:", e);
    return NONE;
  }
}

/** A readable, collision-resistant code derived from the partner's name. */
function candidateCode(nameEn: string, nameAr: string, attempt: number): string {
  if (attempt >= 4) return `PARTNER${Math.floor(100000 + Math.random() * 900000)}`;
  const base = (nameEn || nameAr)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  const stem = base.length >= 3 ? base : "PARTNER";
  return `${stem}${Math.floor(1000 + Math.random() * 9000)}`;
}

export interface PartnerPromoResult {
  code: string | null;
  discountPercent: number;
  error?: string;
}

/**
 * Make sure a partner has exactly one live discount code at the given
 * percentage — creating it, or re-pricing the one they already have.
 *
 * The code string itself never changes once handed out: students may already
 * be carrying it. Only the percentage and the expiry move.
 */
export async function ensurePartnerPromoCode(params: {
  partnerSchoolId: string;
  nameEn: string;
  nameAr: string;
  discountPercent: number;
  expiresAt: Date | null;
  createdBy?: string;
}): Promise<PartnerPromoResult> {
  const pct = Math.min(Math.max(Number(params.discountPercent) || 0, 0), 100);

  try {
    const existing = await prisma.promoCode.findFirst({
      where: { partnerSchoolId: params.partnerSchoolId },
      orderBy: { createdAt: "asc" },
      select: { id: true, code: true },
    });

    if (existing) {
      await prisma.promoCode.update({
        where: { id: existing.id },
        data: {
          type: "PERCENTAGE",
          value: pct,
          expiresAt: params.expiresAt,
          isActive: pct > 0,
        },
      });
      return { code: existing.code, discountPercent: pct };
    }

    if (pct <= 0) return { code: null, discountPercent: 0 };

    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = candidateCode(params.nameEn, params.nameAr, attempt);
      const clash = await prisma.promoCode.findUnique({
        where: { code: candidate },
        select: { id: true },
      });
      if (clash) continue;
      await prisma.promoCode.create({
        data: {
          code: candidate,
          type: "PERCENTAGE",
          value: pct,
          startsAt: new Date(),
          expiresAt: params.expiresAt,
          isActive: true,
          maxUsesPerUser: 1,
          partnerSchoolId: params.partnerSchoolId,
          description: `Success partner: ${params.nameEn || params.nameAr}`,
          descriptionAr: `شريك نجاح: ${params.nameAr || params.nameEn}`,
          createdBy: params.createdBy ?? null,
        },
      });
      return { code: candidate, discountPercent: pct };
    }
    return { code: null, discountPercent: pct, error: "COULD_NOT_MINT_CODE" };
  } catch (e) {
    console.error("[partner-referrals] ensurePartnerPromoCode failed:", e);
    return { code: null, discountPercent: pct, error: "DB_ERROR" };
  }
}
