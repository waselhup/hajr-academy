import { NextResponse } from "next/server";
import { PACKAGE_LIST, VAT_RATE } from "@/lib/finance/packages";

export const dynamic = "force-dynamic";

/**
 * GET /api/subscriptions/packages — public package catalogue with pricing.
 * VAT-inclusive totals are computed server-side.
 */
export async function GET() {
  const packages = PACKAGE_LIST.map((p) => {
    const vat = +(p.pricePerMonth * VAT_RATE).toFixed(2);
    return {
      key: p.key,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      pricePerMonth: p.pricePerMonth,
      vatAmount: vat,
      totalWithVat: +(p.pricePerMonth + vat).toFixed(2),
      sessionsPerMonth: p.sessionsPerMonth,
      featuresAr: p.featuresAr,
      featuresEn: p.featuresEn,
      labAccess: p.labAccess,
    };
  });
  return NextResponse.json({ packages, vatRate: VAT_RATE });
}
