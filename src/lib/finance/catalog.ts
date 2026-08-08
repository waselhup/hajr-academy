/**
 * The purchasable catalogue — the single source of truth for what the
 * public site sells and for what a buyer is actually charged.
 *
 * The landing page, the checkout form and the payment settlement all read
 * prices from here, so a displayed price and a charged price cannot drift
 * apart. Nothing about money is ever taken from the browser.
 *
 * Owners edit these rows in /admin/finance/products; the seed script
 * (scripts/seed-catalog.ts) only creates missing rows unless --force.
 */

import { prisma } from "@/lib/prisma";
import { validatePromoCode } from "./promo-codes";

export interface CatalogItem {
  slug: string;
  nameAr: string;
  nameEn: string;
  descAr: string | null;
  descEn: string | null;
  priceSar: number;
  compareAtSar: number | null;
  unitAr: string;
  unitEn: string;
  group: "CORE" | "COURSE" | "SUMMER";
  packageType: string | null;
  /** Ask the buyer which school year the student is in. */
  requiresGradeLevel: boolean;
  bulletsAr: string[];
  bulletsEn: string[];
}

function toItem(p: {
  slug: string;
  nameAr: string;
  nameEn: string;
  descAr: string | null;
  descEn: string | null;
  priceSar: unknown;
  compareAtSar: unknown;
  unitAr: string;
  unitEn: string;
  group: string;
  packageType: string | null;
  requiresGradeLevel?: boolean;
  bulletsAr: string[];
  bulletsEn: string[];
}): CatalogItem {
  return {
    slug: p.slug,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    descAr: p.descAr,
    descEn: p.descEn,
    priceSar: Number(p.priceSar),
    compareAtSar: p.compareAtSar == null ? null : Number(p.compareAtSar),
    unitAr: p.unitAr,
    unitEn: p.unitEn,
    group: p.group as CatalogItem["group"],
    packageType: p.packageType,
    requiresGradeLevel: p.requiresGradeLevel ?? false,
    bulletsAr: p.bulletsAr ?? [],
    bulletsEn: p.bulletsEn ?? [],
  };
}

/** Every product on sale, in display order. Empty on DB failure. */
export async function listActiveProducts(): Promise<CatalogItem[]> {
  try {
    const rows = await prisma.catalogProduct.findMany({
      where: { isActive: true },
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
    });
    return rows.map(toItem);
  } catch (e) {
    console.error("[catalog] listActiveProducts failed:", e);
    return [];
  }
}

/** One product by slug, only if it is on sale. */
export async function getProduct(slug: string): Promise<CatalogItem | null> {
  if (!slug) return null;
  try {
    const row = await prisma.catalogProduct.findFirst({
      where: { slug, isActive: true },
    });
    return row ? toItem(row) : null;
  } catch (e) {
    console.error("[catalog] getProduct failed:", e);
    return null;
  }
}

export interface PricedOrder {
  listPriceSar: number;
  discountSar: number;
  /** What the card is actually charged. */
  totalSar: number;
  promoCode: string | null;
  promoCodeId: string | null;
  promoError?: string;
  promoErrorAr?: string;
}

/**
 * Price a product, applying a promo code if one validates.
 *
 * Server-only, and deliberately forgiving about a bad code: an invalid or
 * expired code prices the order at full price and reports why, rather than
 * failing the purchase. The returned total is what gets charged.
 */
export async function priceProduct(params: {
  product: CatalogItem;
  promoCodeStr?: string;
  /** Buyer's phone — enforces the per-buyer cap before an account exists. */
  buyerPhone?: string;
}): Promise<PricedOrder> {
  const list = +Number(params.product.priceSar).toFixed(2);
  const raw = (params.promoCodeStr ?? "").trim();

  const fullPrice = (
    promoError?: string,
    promoErrorAr?: string
  ): PricedOrder => ({
    listPriceSar: list,
    discountSar: 0,
    totalSar: list,
    promoCode: null,
    promoCodeId: null,
    promoError,
    promoErrorAr,
  });

  if (!raw) return fullPrice();

  const res = await validatePromoCode({
    codeStr: raw,
    basePrice: list,
    packageType: params.product.packageType ?? undefined,
  });

  if (!res.valid || !res.code) {
    return fullPrice(res.reason, res.reasonAr);
  }

  // FREE_MONTHS is subscription semantics — it discounts a recurring
  // invoice, not a one-off catalogue purchase. Applying it here would zero
  // out a 1,200 SAR course, so it is refused rather than misinterpreted.
  if (res.code.type === "FREE_MONTHS") {
    return fullPrice(
      "This promo code applies to subscriptions, not one-off purchases.",
      "رمز الخصم هذا خاص بالاشتراكات، ولا ينطبق على الشراء المباشر."
    );
  }

  // Per-buyer cap. A public buyer has no account yet, so prior use is
  // counted by phone number across already-PAID orders.
  if (params.buyerPhone) {
    try {
      const priorUses = await prisma.purchaseOrder.count({
        where: {
          phone: params.buyerPhone,
          promoCode: res.code.code,
          paymentStatus: "PAID",
        },
      });
      if (priorUses >= res.code.maxUsesPerUser) {
        return fullPrice(
          "You have already used this promo code.",
          "لقد استخدمت رمز الخصم هذا مسبقاً."
        );
      }
    } catch (e) {
      console.error("[catalog] promo per-buyer check failed:", e);
    }
  }

  // A promo may not exceed the price, and may not produce a charge below
  // Moyasar's 1.00 SAR minimum — a zero-riyal charge would be rejected by
  // the gateway and strand the buyer.
  const rawDiscount = +Number(res.discountAmount ?? 0).toFixed(2);
  const maxDiscount = +Math.max(0, list - 1).toFixed(2);
  const discount = Math.min(rawDiscount, maxDiscount);
  const total = +(list - discount).toFixed(2);

  return {
    listPriceSar: list,
    discountSar: discount,
    totalSar: total,
    promoCode: res.code.code,
    promoCodeId: res.code.id,
  };
}
