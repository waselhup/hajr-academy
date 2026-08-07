import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/subscriptions/create — RETIRED.
 *
 * Subscriptions used to be sold from an in-code price table that drifted
 * from the published catalogue (IELTS 800 here against 1,200 advertised).
 * Students now buy through /checkout, which prices from CatalogProduct —
 * the same source the public site quotes and the payment settles against.
 *
 * The route stays so a stale client gets a clear answer instead of quietly
 * being sold at the wrong price. The subscription machinery itself remains
 * for admin-created subscriptions; only this self-serve entry point is gone.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Subscriptions are now purchased through the catalogue checkout.",
      errorAr: "أصبح الشراء يتم عبر صفحة الدفع الموحّدة.",
      redirectTo: "/checkout",
    },
    { status: 410 }
  );
}
