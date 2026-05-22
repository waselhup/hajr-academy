import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reconcileByMoyasarId } from "@/lib/finance/payments";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments/callback — Moyasar hosted-form redirect target.
 *
 * Moyasar appends `id` (payment id) and `status` to the callback URL. We
 * reconcile the payment server-side (never trusting the query `status`),
 * then redirect the user to the success or failure page.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const moyasarId = sp.get("id");
  const locale = sp.get("locale") ?? "ar";

  const fail = (reason: string) =>
    NextResponse.redirect(
      new URL(
        `/${locale}/student/billing/failure?reason=${encodeURIComponent(reason)}`,
        req.nextUrl.origin
      )
    );
  const succeed = (invoiceId: string) =>
    NextResponse.redirect(
      new URL(
        `/${locale}/student/billing/success?invoice=${encodeURIComponent(invoiceId)}`,
        req.nextUrl.origin
      )
    );

  if (!moyasarId) return fail("missing-payment-id");

  try {
    // Reconcile against Moyasar (authoritative), then route by outcome.
    const res = await reconcileByMoyasarId(moyasarId);
    const payment = await prisma.payment.findFirst({
      where: { moyasarPaymentId: moyasarId },
      select: { status: true, invoiceId: true },
    });

    if (!res.ok || !payment) {
      return fail(res.error ?? "reconciliation-failed");
    }
    if (payment.status === "PAID") {
      return succeed(payment.invoiceId);
    }
    return fail(payment.status.toLowerCase());
  } catch (e) {
    console.error("[api/payments/callback] failed:", e);
    return fail("server-error");
  }
}

export const POST = GET;
