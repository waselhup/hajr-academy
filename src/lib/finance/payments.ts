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
  halalasToSar,
  mapMoyasarStatus,
  extractCardInfo,
  type MoyasarPayment,
} from "./moyasar";
import { markInvoicePaid, setInvoiceStatus } from "./invoices";
import { advanceSubscriptionPeriod } from "./subscriptions";
import { logAudit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notify";
import { consumePromoCode } from "./promo-codes";
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
 * Alert every admin about money that needs a human decision (a duplicate
 * charge, or a real payment that arrived for an invoice we cannot settle).
 */
async function alertAdmins(params: {
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  invoiceId: string;
}): Promise<void> {
  try {
    await notifyAdmins({
      type: "PAYMENT_RECEIVED",
      title: params.title,
      titleAr: params.titleAr,
      body: params.body,
      bodyAr: params.bodyAr,
      channels: ["inApp", "email"],
      priority: "URGENT",
      refType: "Invoice",
      refId: params.invoiceId,
      actionUrl: `/admin/finance/invoices/${params.invoiceId}`,
    });
  } catch (e) {
    console.error("[payments] admin alert failed:", e);
  }
}

/**
 * Reconcile a local Payment from a fetched Moyasar payment object: update
 * the Payment + Invoice + Subscription, and fire Phase 7 notifications.
 * Idempotent — safe to call from the callback and the webhook, which race.
 *
 * This is the ONLY place an invoice is settled from a gateway payment, so
 * every safety check lives here rather than at the call sites: the hosted
 * form charges the card in the browser, so the amount, the currency and the
 * target invoice are all attacker-controllable and must be re-verified
 * against our own invoice on EVERY pass — not just on first adoption.
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
  const gatewayPaid = localStatus === "PAID";
  const wasPaid = payment.status === "PAID";
  const wasFailed = payment.status === "FAILED";

  // ── Settlement gate 1: the money must match this invoice exactly. ──
  const expectedHalalas = sarToHalalas(Number(payment.invoice.totalSar));
  const amountMatches =
    mp.currency === "SAR" && mp.amount === expectedHalalas;

  // ── Settlement gate 2: the invoice must still be payable. ──
  const invoiceStatus = payment.invoice.status; // legacy PaymentStatus
  const invoiceAlreadyPaid = invoiceStatus === "PAID";
  const invoiceNotPayable =
    invoiceStatus === "WAIVED" || invoiceStatus === "REFUNDED";

  const maySettle = gatewayPaid && amountMatches && !invoiceNotPayable;

  // Refund figures always come from the gateway (dashboard refunds included).
  const refundedSar = halalasToSar(mp.refunded ?? 0);
  const isRefundState =
    localStatus === "REFUNDED" || localStatus === "PARTIALLY_REFUNDED";

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      // A gateway-paid charge we refuse to settle is recorded as FAILED so
      // it can never be mistaken for a settled payment.
      status: gatewayPaid && !amountMatches ? "FAILED" : localStatus,
      cardBrand,
      cardLast4,
      moyasarSource: mp.source as never,
      paidAt: maySettle ? payment.paidAt ?? new Date() : payment.paidAt,
      failedAt:
        localStatus === "FAILED" || (gatewayPaid && !amountMatches)
          ? payment.failedAt ?? new Date()
          : payment.failedAt,
      failureMessage: !amountMatches && gatewayPaid
        ? `Amount mismatch: expected ${expectedHalalas} halalas SAR, got ${mp.amount} ${mp.currency}`
        : localStatus === "FAILED"
          ? (mp.source.message as string | undefined) ?? "Payment failed"
          : payment.failureMessage,
      refundedAmount: isRefundState ? refundedSar : payment.refundedAmount,
      refundedAt: isRefundState
        ? payment.refundedAt ?? new Date()
        : payment.refundedAt,
    },
  });

  // A real charge whose amount does not match the invoice: never settle,
  // always escalate — this is either tampering or a pricing bug. Escalate
  // once per payment, not once per delivery (the callback is replayable and
  // Moyasar retries webhooks).
  if (gatewayPaid && !amountMatches) {
    if (wasFailed) return;
    await logAudit({
      action: "PAYMENT_AMOUNT_MISMATCH",
      entity: "Payment",
      entityId: paymentId,
      metadata: {
        invoiceId: payment.invoiceId,
        moyasarPaymentId: mp.id,
        expectedHalalas,
        receivedHalalas: mp.amount,
        currency: mp.currency,
      },
    });
    await alertAdmins({
      invoiceId: payment.invoiceId,
      title: "Payment amount mismatch — not settled",
      titleAr: "مبلغ الدفعة لا يطابق الفاتورة — لم تُسوَّ",
      body: `Invoice ${payment.invoice.invoiceNumber}: expected ${halalasToSar(expectedHalalas).toFixed(2)} SAR, received ${halalasToSar(mp.amount).toFixed(2)} ${mp.currency} (Moyasar ${mp.id}). Review and refund.`,
      bodyAr: `الفاتورة ${payment.invoice.invoiceNumber}: المتوقع ${halalasToSar(expectedHalalas).toFixed(2)} ر.س والمستلم ${halalasToSar(mp.amount).toFixed(2)} ${mp.currency} (ميسر ${mp.id}). يرجى المراجعة والاسترجاع.`,
    });
    return;
  }

  // A real, correctly-priced charge against an invoice we cannot settle
  // (already paid → duplicate charge; waived/refunded → shouldn't be paid).
  if (gatewayPaid && amountMatches && (invoiceAlreadyPaid || invoiceNotPayable)) {
    // Only escalate when this specific payment is newly settled, so repeat
    // callbacks/webhooks for the same charge don't spam.
    if (!wasPaid) {
      const dup = invoiceAlreadyPaid;
      await logAudit({
        action: dup ? "PAYMENT_DUPLICATE" : "PAYMENT_ON_UNPAYABLE_INVOICE",
        entity: "Payment",
        entityId: paymentId,
        metadata: {
          invoiceId: payment.invoiceId,
          moyasarPaymentId: mp.id,
          invoiceStatus,
        },
      });
      await alertAdmins({
        invoiceId: payment.invoiceId,
        title: dup ? "Duplicate payment received" : "Payment on a non-payable invoice",
        titleAr: dup ? "دفعة مكررة" : "دفعة على فاتورة غير قابلة للسداد",
        body: `Invoice ${payment.invoice.invoiceNumber} is ${invoiceStatus}, but a payment of ${Number(payment.amount).toFixed(2)} SAR settled at Moyasar (${mp.id}). A refund is probably due.`,
        bodyAr: `الفاتورة ${payment.invoice.invoiceNumber} حالتها ${invoiceStatus}، ومع ذلك تم تحصيل ${Number(payment.amount).toFixed(2)} ر.س عبر ميسر (${mp.id}). غالباً يلزم استرجاع المبلغ.`,
      });
    }
    return;
  }

  if (maySettle) {
    const method = sourceToPaymentMethod(mp.source.type, cardBrand);
    // Atomic — only the winner of a callback/webhook race gets alreadyPaid
    // false and therefore advances the period and sends the receipt once.
    const settle = await markInvoicePaid(payment.invoiceId, method);
    if (!settle.ok || settle.alreadyPaid) return;

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
    return;
  }

  // Refund arriving from the gateway (e.g. refunded in the Moyasar
  // dashboard) — mirror it onto the invoice.
  if (localStatus === "REFUNDED" && invoiceStatus !== "REFUNDED") {
    await setInvoiceStatus(payment.invoiceId, "REFUNDED");
    await logAudit({
      action: "PAYMENT_REFUNDED",
      entity: "Payment",
      entityId: paymentId,
      metadata: {
        invoiceId: payment.invoiceId,
        moyasarPaymentId: mp.id,
        refundedAmount: refundedSar,
        source: "gateway",
      },
    });
    return;
  }

  // Failure notifications fire only on the transition into FAILED — the
  // callback GET is user-replayable, and this trigger is URGENT email+SMS.
  if (localStatus === "FAILED" && !wasFailed) {
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

export interface AdoptResult {
  ok: boolean;
  error?: string;
  paymentId?: string;
  invoiceId?: string;
  /** Local PayStatus after reconciliation. */
  status?: string;
  /**
   * What was paid. The callback routes on this rather than on query
   * parameters, which do not reliably survive the gateway round-trip.
   */
  kind?: "invoice" | "order";
  /** Locale round-tripped through the payment metadata. */
  locale?: "ar" | "en";
  /**
   * True when the outcome is unknown rather than negative — the gateway or
   * the database could not be reached. The payer may well have been charged,
   * so callers must show "verifying", not "failed", and the webhook must ask
   * Moyasar to retry.
   */
  transient?: boolean;
}

/**
 * Adopt a payment created outside our API — the Moyasar hosted form (MPF)
 * charges the card client-side with the publishable key, so no local
 * Payment row exists when the user lands on the callback. This fetches the
 * payment from Moyasar (authoritative), matches it to our invoice via
 * `metadata.invoice_id`, records it locally and reconciles.
 *
 * Idempotent: an already-adopted payment is just re-reconciled, so the
 * callback and the webhook can race freely. Every safety decision (amount,
 * currency, invoice payability, settlement) is made inside
 * `reconcileFromMoyasarPayment`, which runs on every pass — this function
 * deliberately holds no security logic of its own that a second delivery
 * could skip.
 */
export async function adoptMoyasarPayment(
  moyasarPaymentId: string
): Promise<AdoptResult> {
  const finish = async (
    paymentId: string,
    locale?: "ar" | "en"
  ): Promise<AdoptResult> => {
    const fresh = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { status: true, invoiceId: true },
    });
    return {
      ok: true,
      paymentId,
      invoiceId: fresh?.invoiceId,
      status: fresh?.status,
      kind: "invoice",
      locale,
    };
  };

  // Public landing-page purchase (no Invoice yet — the order is provisioned
  // by an admin afterwards). Handled by its own settler.
  const order = await prisma.purchaseOrder.findFirst({
    where: { moyasarPaymentId },
    select: { id: true },
  });
  if (order) return adoptPurchaseOrderPayment(moyasarPaymentId);

  // Already known → plain reconcile (re-runs every gate).
  const existing = await prisma.payment.findFirst({
    where: { moyasarPaymentId },
    select: { id: true, invoiceId: true },
  });
  if (existing) {
    const re = await reconcilePayment(existing.id);
    if (!re.ok) {
      // Could not reach Moyasar — the local status is stale, so report the
      // outcome as unknown rather than letting the caller call it a failure.
      return {
        ok: false,
        transient: true,
        error: re.error ?? "Could not verify payment.",
        paymentId: existing.id,
        invoiceId: existing.invoiceId,
      };
    }
    return finish(existing.id);
  }

  // Fetch the authoritative payment object from Moyasar.
  const res = await moyasar.getPayment(moyasarPaymentId);
  if (!res.ok || !res.data) {
    return {
      ok: false,
      transient: true,
      error: res.error ?? "Could not fetch payment.",
    };
  }
  const mp = res.data;
  const metaLocale = mp.metadata?.locale === "en" ? "en" : "ar";

  // A landing-page purchase carries an order id instead of an invoice id.
  if (mp.metadata?.purchase_order_id) {
    return adoptPurchaseOrderPayment(moyasarPaymentId, mp);
  }

  const invoiceId = mp.metadata?.invoice_id ?? "";
  if (!invoiceId) {
    // Real money at the gateway that we cannot attribute to anything —
    // a human must reconcile it, so never fail silently.
    await orphanPaymentAlert(mp, "no invoice reference in metadata");
    return { ok: false, error: "Payment carries no invoice reference." };
  }
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, totalSar: true },
  });
  if (!invoice) {
    await orphanPaymentAlert(mp, `invoice ${invoiceId} not found`);
    return { ok: false, error: "Unknown invoice.", invoiceId };
  }

  // Record the payment against its invoice. The amount stored is what
  // Moyasar actually charged (never the invoice total), so a mismatch stays
  // visible in the ledger; reconciliation decides whether it may settle.
  let paymentId: string;
  try {
    const created = await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: halalasToSar(mp.amount),
        currency: mp.currency,
        status: "INITIATED",
        moyasarPaymentId,
        moyasarSource: mp.source as never,
      },
    });
    paymentId = created.id;
  } catch {
    // Unique-constraint race (webhook vs. callback): the other writer won —
    // reuse its row.
    const winner = await prisma.payment.findFirst({
      where: { moyasarPaymentId },
      select: { id: true },
    });
    if (!winner) {
      return {
        ok: false,
        transient: true,
        error: "Payment could not be recorded.",
        invoiceId,
      };
    }
    paymentId = winner.id;
  }

  await reconcileFromMoyasarPayment(paymentId, mp);
  return finish(paymentId, metaLocale);
}

/**
 * A settled charge we cannot attribute to an invoice or an order. The money
 * is real, so this always reaches a human rather than being swallowed.
 */
async function orphanPaymentAlert(
  mp: MoyasarPayment,
  why: string
): Promise<void> {
  if (mapMoyasarStatus(mp.status, mp.refunded, mp.amount) !== "PAID") return;
  await logAudit({
    action: "PAYMENT_UNATTRIBUTED",
    entity: "Payment",
    metadata: {
      moyasarPaymentId: mp.id,
      amountHalalas: mp.amount,
      currency: mp.currency,
      reason: why,
    },
  });
  try {
    await notifyAdmins({
      type: "PAYMENT_RECEIVED",
      title: "Unattributed payment received",
      titleAr: "دفعة غير مرتبطة بأي فاتورة",
      body: `Moyasar ${mp.id} captured ${halalasToSar(mp.amount).toFixed(2)} ${mp.currency} but ${why}. Reconcile or refund it manually.`,
      bodyAr: `تم تحصيل ${halalasToSar(mp.amount).toFixed(2)} ${mp.currency} عبر ميسر (${mp.id}) لكن ${why}. يرجى المطابقة أو الاسترجاع يدوياً.`,
      channels: ["inApp", "email"],
      priority: "URGENT",
      refType: "Payment",
      refId: mp.id,
      actionUrl: "/admin/finance",
    });
  } catch (e) {
    console.error("[payments] orphan alert failed:", e);
  }
}

/**
 * Settle a public landing-page purchase (PurchaseOrder) from a Moyasar
 * payment. Same discipline as invoices: the gateway is authoritative, the
 * amount is re-validated against our own server-side package price on every
 * delivery, and settlement is an atomic conditional update so the callback
 * and the webhook cannot both "first-settle" the same order.
 */
export async function adoptPurchaseOrderPayment(
  moyasarPaymentId: string,
  prefetched?: MoyasarPayment
): Promise<AdoptResult> {
  let mp = prefetched;
  if (!mp) {
    const res = await moyasar.getPayment(moyasarPaymentId);
    if (!res.ok || !res.data) {
      return {
        ok: false,
        transient: true,
        error: res.error ?? "Could not fetch payment.",
      };
    }
    mp = res.data;
  }

  const locale = mp.metadata?.locale === "en" ? "en" : "ar";
  const orderId = mp.metadata?.purchase_order_id ?? "";
  if (!orderId) {
    await orphanPaymentAlert(mp, "no order reference in metadata");
    return { ok: false, error: "Payment carries no order reference.", kind: "order", locale };
  }
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      amountSar: true,
      paymentStatus: true,
      studentName: true,
      phone: true,
      packageType: true,
      promoCode: true,
      status: true,
      moyasarPaymentId: true,
    },
  });
  if (!order) {
    await orphanPaymentAlert(mp, `order ${orderId} not found`);
    return { ok: false, error: "Unknown order.", kind: "order", locale };
  }

  const status = mapMoyasarStatus(mp.status, mp.refunded, mp.amount);
  const expectedHalalas = sarToHalalas(Number(order.amountSar));
  const amountMatches = mp.currency === "SAR" && mp.amount === expectedHalalas;

  if (status !== "PAID") {
    return {
      ok: true,
      invoiceId: order.id,
      status: status === "FAILED" ? "FAILED" : "INITIATED",
      kind: "order",
      locale,
    };
  }

  if (!amountMatches) {
    await logAudit({
      action: "PAYMENT_AMOUNT_MISMATCH",
      entity: "PurchaseOrder",
      entityId: order.id,
      metadata: {
        moyasarPaymentId,
        expectedHalalas,
        receivedHalalas: mp.amount,
        currency: mp.currency,
      },
    });
    await orphanPaymentAlert(
      mp,
      `amount does not match order ${order.id} (expected ${expectedHalalas} halalas SAR)`
    );
    return {
      ok: false,
      error: "Payment amount mismatch.",
      invoiceId: order.id,
      kind: "order",
      locale,
    };
  }

  // An order the admin cancelled must never be settled by a late payment.
  if (order.status === "CANCELLED") {
    await orphanPaymentAlert(
      mp,
      `order ${order.id} was cancelled before this payment arrived`
    );
    return {
      ok: false,
      error: "This order was cancelled.",
      invoiceId: order.id,
      kind: "order",
      locale,
    };
  }

  // A DIFFERENT payment for an order that is already settled is a genuine
  // double charge (double-tap, retried link, 3-D Secure timeout). It must
  // never be silently absorbed — a refund is owed.
  if (
    order.paymentStatus === "PAID" &&
    order.moyasarPaymentId &&
    order.moyasarPaymentId !== moyasarPaymentId
  ) {
    await logAudit({
      action: "PAYMENT_DUPLICATE",
      entity: "PurchaseOrder",
      entityId: order.id,
      metadata: {
        moyasarPaymentId,
        alreadySettledWith: order.moyasarPaymentId,
        amountSar: Number(order.amountSar),
      },
    });
    try {
      await notifyAdmins({
        type: "PAYMENT_RECEIVED",
        title: "Duplicate payment on a paid order",
        titleAr: "دفعة مكررة على طلب مدفوع",
        body: `${order.studentName} (${order.phone}) was charged ${Number(order.amountSar).toFixed(2)} SAR twice — Moyasar ${moyasarPaymentId} in addition to ${order.moyasarPaymentId}. A refund is due.`,
        bodyAr: `تم تحصيل ${Number(order.amountSar).toFixed(2)} ر.س مرتين من ${order.studentName} (${order.phone}) — العملية ${moyasarPaymentId} إضافة إلى ${order.moyasarPaymentId}. يلزم استرجاع المبلغ.`,
        channels: ["inApp", "email"],
        priority: "URGENT",
        refType: "PurchaseOrder",
        refId: order.id,
        actionUrl: "/admin/orders",
      });
    } catch (e) {
      console.error("[payments] duplicate-order alert failed:", e);
    }
    return { ok: true, invoiceId: order.id, status: "PAID", kind: "order", locale };
  }

  // Atomic settle — only the first delivery flips PENDING → PAID.
  const claimed = await prisma.purchaseOrder.updateMany({
    where: { id: order.id, paymentStatus: { not: "PAID" } },
    data: {
      paymentStatus: "PAID",
      paidAt: new Date(),
      moyasarPaymentId,
    },
  });

  if (claimed.count > 0) {
    // Consume the promo code only now that money has actually moved —
    // counting it at checkout would let abandoned carts burn a limited code.
    if (order.promoCode) {
      try {
        const promo = await prisma.promoCode.findUnique({
          where: { code: order.promoCode },
          select: { id: true },
        });
        if (promo) await consumePromoCode(promo.id);
      } catch (e) {
        console.error("[payments] promo consume failed:", e);
      }
    }

    await logAudit({
      action: "PURCHASE_ORDER_PAID",
      entity: "PurchaseOrder",
      entityId: order.id,
      metadata: { moyasarPaymentId, amountSar: Number(order.amountSar) },
    });
    try {
      await notifyAdmins({
        type: "PAYMENT_RECEIVED",
        title: `Paid order — provision ${order.studentName}`,
        titleAr: `طلب مدفوع — تجهيز حساب ${order.studentName}`,
        body: `${order.studentName} (${order.phone}) paid ${Number(order.amountSar).toFixed(2)} SAR for ${order.packageType}. Create the student account.`,
        bodyAr: `${order.studentName} (${order.phone}) دفع ${Number(order.amountSar).toFixed(2)} ر.س لباقة ${order.packageType}. يرجى إنشاء حساب الطالب.`,
        channels: ["inApp", "email"],
        priority: "HIGH",
        refType: "PurchaseOrder",
        refId: order.id,
        actionUrl: "/admin/orders",
      });
    } catch (e) {
      console.error("[payments] order-paid notify failed:", e);
    }
  }

  return { ok: true, invoiceId: order.id, status: "PAID", kind: "order", locale };
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
