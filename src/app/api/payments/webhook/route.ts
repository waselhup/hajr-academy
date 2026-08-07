import { NextRequest, NextResponse } from "next/server";
import { verifyMoyasarWebhook } from "@/lib/finance/moyasar";
import { adoptMoyasarPayment } from "@/lib/finance/payments";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/webhook — Moyasar async event webhook.
 *
 * Moyasar posts a JSON body carrying `type`, `data` (the payment), and a
 * shared `secret_token`. The token is verified before any state change.
 * Reconciliation is idempotent, so duplicate deliveries are harmless.
 */
export async function POST(req: NextRequest) {
  let payload: {
    type?: string;
    secret_token?: string;
    data?: { id?: string; status?: string };
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify the shared secret before doing anything.
  const check = verifyMoyasarWebhook(payload);
  if (!check.valid) {
    await logAudit({
      action: "MOYASAR_WEBHOOK_REJECTED",
      entity: "Payment",
      metadata: { reason: check.reason ?? "invalid" },
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const moyasarId = payload.data?.id;
  if (!moyasarId) {
    return NextResponse.json({ ok: true, skipped: "no-payment-id" });
  }

  // Moyasar also emits payout_* and balance_* events, whose `data.id` is a
  // payout id, not a payment id. Feeding those to the payment reconciler
  // would chase ids that can never resolve, so only payment events pass.
  const eventType = payload.type ?? "";
  if (eventType && !eventType.startsWith("payment_")) {
    return NextResponse.json({ ok: true, skipped: eventType });
  }

  try {
    // Adopt-or-reconcile: hosted-form payments have no local row yet if the
    // user never returned through the callback (closed tab, dropped link).
    const res = await adoptMoyasarPayment(moyasarId);
    await logAudit({
      action: "MOYASAR_WEBHOOK_PROCESSED",
      entity: "Payment",
      metadata: {
        type: payload.type ?? "unknown",
        moyasarPaymentId: moyasarId,
        reconciled: res.ok,
        transient: res.transient ?? false,
      },
    });
    // Transient failure (gateway/DB unreachable): ask Moyasar to redeliver —
    // a 200 would permanently consume the one delivery that is our only
    // recovery path when the payer never returns through the callback.
    if (!res.ok && res.transient) {
      return NextResponse.json(
        { ok: false, error: "Temporarily unable to verify — please retry." },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, reconciled: res.ok });
  } catch (e) {
    console.error("[api/payments/webhook] failed:", e);
    return NextResponse.json(
      { ok: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
