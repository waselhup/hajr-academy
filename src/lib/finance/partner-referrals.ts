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

// ─────────────────────── Commission ledger ───────────────────────

export interface PartnerLedger {
  /** Commission earned, summed from the snapshots frozen on paid orders. */
  owedSar: number;
  /** Commission actually paid out, entered by an admin. */
  paidSar: number;
  /** owed − paid. Negative means the partner was overpaid. */
  remainingSar: number;
  referredOrders: number;
  referredSalesSar: number;
}

const EMPTY_LEDGER: PartnerLedger = {
  owedSar: 0,
  paidSar: 0,
  remainingSar: 0,
  referredOrders: 0,
  referredSalesSar: 0,
};

/**
 * Earned-vs-paid for every partner, keyed by partner id.
 *
 * Earned is derived from sales and is not editable; paid is human-entered.
 * They are summed separately on purpose — a mismatch between them is a real
 * finding, not something to paper over by storing one number.
 */
export async function partnerLedgers(): Promise<Map<string, PartnerLedger>> {
  const out = new Map<string, PartnerLedger>();
  try {
    const [earned, paid] = await Promise.all([
      prisma.purchaseOrder.groupBy({
        by: ["partnerSchoolId"],
        where: { paymentStatus: "PAID", partnerSchoolId: { not: null } },
        _sum: { partnerCommissionSar: true, amountSar: true },
        _count: { _all: true },
      }),
      prisma.partnerPayout.groupBy({
        by: ["partnerSchoolId"],
        _sum: { amountSar: true },
      }),
    ]);

    for (const e of earned) {
      out.set(e.partnerSchoolId as string, {
        ...EMPTY_LEDGER,
        owedSar: Number(e._sum.partnerCommissionSar ?? 0),
        referredSalesSar: Number(e._sum.amountSar ?? 0),
        referredOrders: e._count._all,
      });
    }
    for (const p of paid) {
      const prev = out.get(p.partnerSchoolId) ?? { ...EMPTY_LEDGER };
      out.set(p.partnerSchoolId, {
        ...prev,
        paidSar: Number(p._sum.amountSar ?? 0),
      });
    }
    for (const [id, l] of out) {
      out.set(id, { ...l, remainingSar: +(l.owedSar - l.paidSar).toFixed(2) });
    }
  } catch (e) {
    console.error("[partner-referrals] partnerLedgers failed:", e);
  }
  return out;
}

export function emptyLedger(): PartnerLedger {
  return { ...EMPTY_LEDGER };
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

/**
 * Per-student cap on a recurring partner code.
 *
 * The promo layer expresses "how many times may ONE person use this", and a
 * charity sponsors a beneficiary for a year, not a month — so the cap has to
 * be effectively lifted. A large finite number rather than unlimited: it
 * still trips if something starts looping, which unlimited never would.
 * Kept in sync with scripts/apply-partner-payouts-migration.ts.
 */
export const RECURRING_USES_PER_USER = 999;

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
  /** Keep discounting the same student on later purchases. Default true. */
  discountRecurs?: boolean;
  createdBy?: string;
}): Promise<PartnerPromoResult> {
  const pct = Math.min(Math.max(Number(params.discountPercent) || 0, 0), 100);
  const perUser =
    params.discountRecurs === false ? 1 : RECURRING_USES_PER_USER;

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
          maxUsesPerUser: perUser,
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
          maxUsesPerUser: perUser,
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
