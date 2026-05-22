/**
 * Payment + refund processing (Phase 8).
 *
 * Bridges Moyasar ⇄ our `Payment`/`Invoice`/`Subscription` rows:
 *   - `initiatePayment`   creates a Payment + Moyasar charge for an invoice
 *   - `reconcilePayment`  fetches a Moyasar payment and syncs local state
 *   - `processRefund`     issues a (partial/full) refund and updates state
 *
 * On a successful payment the invoice is marked PAID, the subscription
 * period advances, and Phase 7 notification triggers fire (best-effort).
 *
 * All money is SAR locally; the Moyasar boundary uses halalas.
 */

import { prisma } from "@/lib/prisma";
import {
  moyasar,
  sarToHalalas,
  mapMoyasarStatus,
  extractCardInfo,
  type MoyasarPayment,
} from "./moyasar";
import { markInvoicePaid, setInvoiceStatus } from "./invoices";
import { advanceSubscriptionPeriod } from "./subscriptions";
import { logAudit } from "@/lib/audit";
import {
  triggerPaymentReceived,
  triggerPaymentFailed,
} from "@/lib/comms/triggers";

/** Map a Moyasar source type to our `PaymentMethod` enum. */
function sourceToPaymentMethod(
  sourceType: string,
  cardBrand: string | null
):
  | "MOYASAR_CARD"
  | "MADA"
  | "APPLE_PAY"
  | "STC_PAY" {
  if (sourceType === "applepay") return "APPLE_PAY";
  if (sourceType === "stcpay") return "STC_PAY";
  if (cardBrand && cardBrand.toLowerCase() === "mada") return "MADA";
  return "MOYASAR_CARD";
}

export interface InitiatePaymentResult {
  ok: boolean;
  error?: string;
  paymentId?: string;
  moyasarPaymentId?: string;
  status?: string;
  mock: boolean;
  /** When true the invoice is already settled — caller should redirect. */
  alreadyPaid?: boolean;
}

/**
 * Create a payment for an invoice and charge it via Moyasar.
 *
 * Guards against duplicate payments: an already-PAID invoice is rejected.
 * In mock mode the synthesised Moyasar response is "paid", so this single
 * call also reconciles the invoice end-to-end.
 */
export async function initiatePayment(params: {
  invoiceId: string;
  source: { type: string; [key: string]: unknown };
  callbackUrl: string;
}): Promise<InitiatePaymentResult> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.invoiceId },
    include: { student: { include: { user: { select: { name: true } } } } },
  });
  if (!invoice) {
    return { ok: false, error: "Invoice not found.", mock: moyasar.isMockMode };
  }

  // No duplicate payments.
  if (invoice.status === "PAID") {
    return {
      ok: true,
      alreadyPaid: true,
      mock: moyasar.isMockMode,
      status: "PAID",
    };
  }
  if (invoice.status === "WAIVED") {
    return {
      ok: false,
      error: "This invoice is cancelled and cannot be paid.",
      mock: moyasar.isMockMode,
    };
  }

  const amountSar = Number(invoice.totalSar);

  // Create the local Payment row up-front (status INITIATED).
  const payment = await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      amount: amountSar,
      currency: "SAR",
      status: "INITIATED",
    },
  });

  // Charge via Moyasar (mock mode returns a paid response).
  const charge = await moyasar.createPayment({
    amount: sarToHalalas(amountSar),
    currency: "SAR",
    description: `HAJR Academy — Invoice ${invoice.invoiceNumber}`,
    callbackUrl: params.callbackUrl,
    source: params.source,
    metadata: { invoice_id: invoice.id, payment_id: payment.id },
  });

  if (!charge.ok || !charge.data) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        failureMessage: charge.error ?? "Charge failed",
      },
    });
    return {
      ok: false,
      error: charge.error ?? "Payment could not be processed.",
      paymentId: payment.id,
      mock: charge.mock,
    };
  }

  // Persist the Moyasar id immediately so callbacks/webhooks can match.
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      moyasarPaymentId: charge.data.id,
      moyasarSource: charge.data.source as never,
    },
  });

  // If the charge already resolved (mock mode, or instant methods),
  // reconcile right away.
  await reconcileFromMoyasarPayment(payment.id, charge.data);

  return {
    ok: true,
    paymentId: payment.id,
    moyasarPaymentId: charge.data.id,
    status: charge.data.status,
    mock: charge.mock,
  };
}

/**
 * Reconcile a local Payment from a fetched Moyasar payment object: update
 * the Payment + Invoice + Subscription, and fire Phase 7 notifications.
 * Idempotent — safe to call from the callback and the webhook.
 */
export async function reconcileFromMoyasarPayment(
  paymentId: string,
  mp: MoyasarPayment
): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { invoice: true },
  });
  if (!payment) return;

  const localStatus = mapMoyasarStatus(mp.status, mp.refunded, mp.amount);
  const { cardBrand, cardLast4 } = extractCardInfo(mp.source);
  const isPaid = localStatus === "PAID";

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: localStatus,
      cardBrand,
      cardLast4,
      moyasarSource: mp.source as never,
      paidAt: isPaid ? new Date() : payment.paidAt,
      failedAt: localStatus === "FAILED" ? new Date() : payment.failedAt,
      failureMessage:
        localStatus === "FAILED"
          ? (mp.source.message as string | undefined) ?? "Payment failed"
          : payment.failureMessage,
    },
  });

  if (isPaid && payment.invoice.status !== "PAID") {
    const method = sourceToPaymentMethod(mp.source.type, cardBrand);
    await markInvoicePaid(payment.invoiceId, method);

    // Advance the subscription period, if this invoice belongs to one.
    if (payment.invoice.subscriptionId) {
      await advanceSubscriptionPeriod(payment.invoice.subscriptionId);
    }

    await logAudit({
      action: "PAYMENT_SUCCEEDED",
      entity: "Payment",
      entityId: paymentId,
      metadata: {
        invoiceId: payment.invoiceId,
        moyasarPaymentId: mp.id,
        amount: Number(payment.amount),
      },
    });

    // Phase 7: receipt + in-app notification.
    try {
      await triggerPaymentReceived(payment.invoiceId);
    } catch (e) {
      console.error("[payments] triggerPaymentReceived failed:", e);
    }
  } else if (localStatus === "FAILED") {
    await logAudit({
      action: "PAYMENT_FAILED",
      entity: "Payment",
      entityId: paymentId,
      metadata: { invoiceId: payment.invoiceId, moyasarPaymentId: mp.id },
    });
    try {
      await triggerPaymentFailed(payment.invoiceId);
    } catch (e) {
      console.error("[payments] triggerPaymentFailed failed:", e);
    }
  }
}

/** Fetch a payment from Moyasar by its id and reconcile local state. */
export async function reconcilePayment(
  paymentId: string
): Promise<{ ok: boolean; status?: string; error?: string }> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });
  if (!payment) return { ok: false, error: "Payment not found." };
  if (!payment.moyasarPaymentId) {
    return { ok: false, error: "Payment has no Moyasar reference." };
  }

  const res = await moyasar.getPayment(payment.moyasarPaymentId);
  if (!res.ok || !res.data) {
    return { ok: false, error: res.error ?? "Could not fetch payment." };
  }
  await reconcileFromMoyasarPayment(paymentId, res.data);
  return { ok: true, status: res.data.status };
}

/** Find a local payment by its Moyasar id (for webhook reconciliation). */
export async function reconcileByMoyasarId(
  moyasarPaymentId: string
): Promise<{ ok: boolean; error?: string }> {
  const payment = await prisma.payment.findFirst({
    where: { moyasarPaymentId },
  });
  if (!payment) return { ok: false, error: "Unknown Moyasar payment." };
  return reconcilePayment(payment.id);
}

export interface RefundResult {
  ok: boolean;
  error?: string;
  refundedAmount?: number;
  mock: boolean;
}

/**
 * Process a refund against a payment. `amountSar` omitted = full refund.
 * Validates the requested amount never exceeds what remains refundable.
 */
export async function processRefund(params: {
  paymentId: string;
  amountSar?: number;
  reason?: string;
}): Promise<RefundResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: params.paymentId },
    include: { invoice: true },
  });
  if (!payment) {
    return { ok: false, error: "Payment not found.", mock: moyasar.isMockMode };
  }
  if (payment.status !== "PAID" && payment.status !== "PARTIALLY_REFUNDED") {
    return {
      ok: false,
      error: "Only paid payments can be refunded.",
      mock: moyasar.isMockMode,
    };
  }

  const paid = Number(payment.amount);
  const alreadyRefunded = Number(payment.refundedAmount);
  const refundable = +(paid - alreadyRefunded).toFixed(2);
  if (refundable <= 0) {
    return {
      ok: false,
      error: "This payment is already fully refunded.",
      mock: moyasar.isMockMode,
    };
  }

  // Server-side validation: refund amount ≤ remaining refundable amount.
  const requested =
    params.amountSar != null
      ? +Number(params.amountSar).toFixed(2)
      : refundable;
  if (requested <= 0) {
    return {
      ok: false,
      error: "Refund amount must be greater than zero.",
      mock: moyasar.isMockMode,
    };
  }
  if (requested > refundable) {
    return {
      ok: false,
      error: `Refund amount cannot exceed ${refundable.toFixed(2)} SAR.`,
      mock: moyasar.isMockMode,
    };
  }

  // Issue the refund via Moyasar.
  let mock = moyasar.isMockMode;
  if (payment.moyasarPaymentId) {
    const res = await moyasar.refundPayment(
      payment.moyasarPaymentId,
      sarToHalalas(requested)
    );
    mock = res.mock;
    if (!res.ok) {
      return { ok: false, error: res.error ?? "Refund failed.", mock };
    }
  }

  const newRefunded = +(alreadyRefunded + requested).toFixed(2);
  const fullyRefunded = newRefunded >= paid;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      refundedAmount: newRefunded,
      refundReason: params.reason ?? payment.refundReason,
      refundedAt: new Date(),
      status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
    },
  });

  // Reflect on the invoice: full refund → REFUNDED status.
  if (fullyRefunded) {
    await setInvoiceStatus(payment.invoiceId, "REFUNDED");
  }

  await logAudit({
    action: fullyRefunded ? "PAYMENT_REFUNDED" : "PAYMENT_PARTIALLY_REFUNDED",
    entity: "Payment",
    entityId: payment.id,
    metadata: {
      invoiceId: payment.invoiceId,
      refundedAmount: requested,
      totalRefunded: newRefunded,
      reason: params.reason ?? null,
    },
  });

  return { ok: true, refundedAmount: requested, mock };
}
