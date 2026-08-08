/**
 * What happens the moment a landing-page purchase is actually paid.
 *
 * Before this existed, a settled order sat in a queue until an admin typed
 * the buyer's email, invented a password, and phoned them with it. That is
 * five manual steps between "the customer paid" and "the customer can log
 * in", and the credentials only ever travelled by hand.
 *
 * Now the settlement itself:
 *   1. finds the buyer's existing account, or creates one (no password);
 *   2. records the money as a real PAID invoice, so it shows up in finance;
 *   3. issues a single-use "choose your password" link and emails it;
 *   4. hands the same link to admins with a WhatsApp button, so a mail
 *      failure never strands a paying customer.
 *
 * Every step is best-effort AFTER the payment is already settled: this is
 * called from the gateway settlement path, and nothing here may throw its
 * way back into it. A failure leaves work for a human, never lost money.
 */

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notifyAdmins, notify } from "@/lib/notify";
import {
  issueAndSendSetupLink,
  sendPurchaseReceiptEmail,
  type InvoiceSummary,
} from "@/lib/auth/account-setup";
import { createInvoice, markInvoicePaid, renderInvoiceDocument } from "./invoices";
import { uploadInvoiceDocument } from "./invoice-storage";
import { VAT_RATE } from "./zatca";
import { getProduct } from "./catalog";
import { attributeReferral } from "./partner-referrals";

/** Map a catalogue package tag onto the student's `activePackage`. */
function packageToActive(
  pkg: string | null
): "ESSENTIAL" | "INTEGRATED" | "PRIVATE" | "SCHOOL" {
  switch (pkg) {
    case "ESSENTIAL":
      return "ESSENTIAL";
    case "PRIVATE":
    case "IELTS_PREP_PKG":
      return "PRIVATE";
    case "SCHOOL":
      return "SCHOOL";
    default:
      return "INTEGRATED";
  }
}

export interface FulfilResult {
  ok: boolean;
  userId?: string;
  studentId?: string;
  invoiceId?: string;
  setupUrl?: string;
  emailed?: boolean;
  /** True when the buyer already had an account (no new one was made). */
  linkedExisting?: boolean;
  error?: string;
}

/**
 * Turn a paid PurchaseOrder into a usable account + a booked invoice.
 * Idempotent: an order that already has `provisionedStudentId` is left
 * alone, so callback/webhook races and manual retries are harmless.
 */
export async function fulfilPaidOrder(orderId: string): Promise<FulfilResult> {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      studentName: true,
      phone: true,
      email: true,
      packageType: true,
      productSlug: true,
      amountSar: true,
      listPriceSar: true,
      discountSar: true,
      promoCode: true,
      paymentStatus: true,
      status: true,
      provisionedStudentId: true,
    },
  });
  if (!order) return { ok: false, error: "ORDER_NOT_FOUND" };
  if (order.paymentStatus !== "PAID") return { ok: false, error: "NOT_PAID" };
  if (order.provisionedStudentId) {
    return { ok: true, userId: order.provisionedStudentId, linkedExisting: true };
  }

  // Atomically claim the order before doing any work. The callback and the
  // webhook settle the same payment concurrently, and a read-then-write
  // check would let both pass — producing two accounts and two invoices for
  // one purchase. `fulfilmentClaimedAt` is set by exactly one of them.
  const claim = await prisma.purchaseOrder.updateMany({
    where: { id: orderId, fulfilmentClaimedAt: null },
    data: { fulfilmentClaimedAt: new Date() },
  });
  if (claim.count === 0) {
    return { ok: true, error: "ALREADY_CLAIMED" };
  }

  // Without an email address there is no account identity to create, and no
  // way to send the link. Leave it for an admin rather than inventing one.
  const email = (order.email ?? "").trim().toLowerCase();
  if (!email) {
    await alertAdminsManualNeeded(order.id, order.studentName, order.phone, "no email on the order");
    return { ok: false, error: "NO_EMAIL" };
  }

  const product = order.productSlug ? await getProduct(order.productSlug) : null;
  const activePackage = packageToActive(order.packageType);

  // ── 1. Find or create the buyer's account ──────────────────────────
  let userId: string;
  let studentId: string;
  let linkedExisting = false;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      emailVerified: true,
      passwordHash: true,
      studentProfile: { select: { id: true } },
    },
  });

  // An account this module created but which was never activated still has
  // no usable password. Treating it as "they already have a login" would
  // leave a paying customer permanently locked out.
  const existingCanLogIn =
    !!existing && !existing.passwordHash.startsWith("nologin:");

  // Someone can register any address without proving they own it. If an
  // UNVERIFIED account with a working password already holds this address,
  // attaching a stranger's purchase to it would hand them the package —
  // so that case goes to a human instead of being resolved automatically.
  if (
    existing &&
    !existing.emailVerified &&
    !existing.passwordHash.startsWith("nologin:")
  ) {
    await alertAdminsManualNeeded(
      order.id,
      order.studentName,
      order.phone,
      `an unverified account already uses ${email} — confirm it is the same person before linking`
    );
    await prisma.purchaseOrder.update({
      where: { id: order.id },
      data: { fulfilmentClaimedAt: null },
    });
    return { ok: false, error: "EMAIL_CLAIMED_UNVERIFIED" };
  }

  if (existing) {
    // The buyer already had an account — attach the purchase to it rather
    // than failing, which is what the old manual flow did.
    linkedExisting = true;
    userId = existing.id;
    if (existing.studentProfile) {
      studentId = existing.studentProfile.id;
      await prisma.studentProfile.update({
        where: { id: studentId },
        data: { activePackage, packageStartedAt: new Date() },
      });
    } else if (existing.role === "STUDENT" || existing.role === "PARENT") {
      const created = await prisma.studentProfile.create({
        data: {
          userId: existing.id,
          activePackage,
          packageStartedAt: new Date(),
        },
        select: { id: true },
      });
      studentId = created.id;
    } else {
      // A teacher/admin bought with their staff address — never repurpose a
      // staff account; hand it to a human.
      await alertAdminsManualNeeded(
        order.id,
        order.studentName,
        order.phone,
        `the email ${email} belongs to a ${existing.role} account`
      );
      return { ok: false, error: "EMAIL_BELONGS_TO_STAFF" };
    }
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        // No password: the buyer sets their own through the setup link.
        // A random unusable hash keeps the column non-null without ever
        // being a credential anyone could guess or be told.
        passwordHash: `nologin:${crypto.randomUUID()}`,
        name: order.studentName,
        phone: order.phone,
        role: "STUDENT",
        emailVerified: false,
        studentProfile: {
          create: { activePackage, packageStartedAt: new Date() },
        },
      },
      select: { id: true, studentProfile: { select: { id: true } } },
    });
    userId = created.id;
    studentId = created.studentProfile!.id;
  }

  // ── 1b. Credit the success partner whose code brought this sale ────
  // Done here, after the student exists and while we still hold the
  // fulfilment claim, so it runs exactly once per order.
  const referral = await attributeReferral({
    promoCode: order.promoCode,
    amountSar: Number(order.amountSar),
    studentProfileId: studentId,
  });

  // ── 2. Book the money as a real invoice ────────────────────────────
  // The catalogue's advertised prices are what the customer actually pays,
  // i.e. VAT-INCLUSIVE. createInvoice expects pre-VAT line items and adds
  // 15% on top, so the gross must be divided out first — otherwise the tax
  // invoice would claim 15% more than the card was charged.
  let invoiceId: string | undefined;
  let invoiceSummary: InvoiceSummary | undefined;
  let invoiceDoc: Buffer | null = null;
  try {
    const grossPaid = Number(order.amountSar);
    const grossList = Number(order.listPriceSar ?? order.amountSar);
    const grossDiscount = +(grossList - grossPaid).toFixed(2);
    const netList = +(grossList / (1 + VAT_RATE)).toFixed(2);
    const netDiscount = +(grossDiscount / (1 + VAT_RATE)).toFixed(2);

    const invoice = await createInvoice({
      studentId,
      type: "ONE_TIME",
      packageType: (order.packageType as never) ?? null,
      discount: netDiscount > 0 ? netDiscount : 0,
      dueInDays: 0,
      notes: order.promoCode ? `Promo ${order.promoCode}` : null,
      lineItems: [
        {
          description: product?.nameEn ?? "HAJR Academy package",
          descriptionAr: product?.nameAr ?? "باقة أكاديمية هجر",
          quantity: 1,
          unitPrice: netList,
        },
      ],
    });
    invoiceId = invoice.id;

    // Record the money against the invoice so the payment is refundable and
    // reconcilable. Without a Payment row the admin refund tooling has
    // nothing to act on and the charge is invisible to reconciliation.
    const moyasarId = await prisma.purchaseOrder
      .findUnique({ where: { id: order.id }, select: { moyasarPaymentId: true } })
      .then((o) => o?.moyasarPaymentId ?? null);
    try {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: grossPaid,
          currency: "SAR",
          status: "PAID",
          paidAt: new Date(),
          moyasarPaymentId: moyasarId,
        },
      });
    } catch (e) {
      // A unique clash means the gateway payment is already recorded
      // elsewhere; the invoice link is the only thing missing and an admin
      // can reconcile it.
      console.error("[fulfil] payment row failed:", e);
    }

    await markInvoicePaid(invoice.id, "MOYASAR_CARD");

    // Re-render AFTER the status flips. The copy produced at creation still
    // says PENDING, and a receipt that says "unpaid" is worse than none —
    // so the stored document is replaced and the fresh one is emailed.
    invoiceSummary = {
      invoiceNumber: invoice.invoiceNumber,
      itemAr: product?.nameAr ?? "باقة أكاديمية هجر",
      itemEn: product?.nameEn ?? "HAJR Academy package",
      subtotalSar: Number(invoice.subtotalSar),
      discountSar: Number(invoice.discountSar),
      vatSar: Number(invoice.vatSar),
      totalSar: Number(invoice.totalSar),
      issuedAt: invoice.issuedAt,
    };
    try {
      invoiceDoc = await renderInvoiceDocument(invoice.id);
      if (invoiceDoc) {
        await uploadInvoiceDocument({
          invoiceNumber: invoice.invoiceNumber,
          year: invoice.year,
          body: invoiceDoc,
        });
      }
    } catch (e) {
      console.error("[fulfil] paid invoice document failed:", e);
    }
  } catch (e) {
    // The customer has paid and has an account; a missing invoice is an
    // accounting gap for an admin, not a reason to fail fulfilment.
    console.error("[fulfil] invoice creation failed:", e);
  }

  // ── 3. Issue + send the "choose your password" link ────────────────
  let setupUrl: string | undefined;
  let emailed = false;
  let whatsappUrl: string | undefined;
  if (!linkedExisting || !existingCanLogIn) {
    const delivery = await issueAndSendSetupLink({
      userId,
      email,
      name: order.studentName,
      phone: order.phone,
      kind: "student",
      // One email carries everything the buyer needs: the receipt, the tax
      // invoice, and the link that turns the purchase into a login.
      invoice: invoiceSummary,
      invoiceAttachment:
        invoiceDoc && invoiceSummary
          ? {
              filename: `HAJR-Invoice-${invoiceSummary.invoiceNumber}.html`,
              content: invoiceDoc,
            }
          : undefined,
    });
    setupUrl = delivery.setupUrl;
    emailed = delivery.emailed;
    whatsappUrl = delivery.whatsappUrl;
  } else {
    // They already have a password — no setup link, but they still bought
    // something, so the receipt goes out on its own.
    if (invoiceSummary) {
      const receipt = await sendPurchaseReceiptEmail({
        email,
        name: order.studentName,
        invoice: invoiceSummary,
        attachment:
          invoiceDoc
            ? {
                filename: `HAJR-Invoice-${invoiceSummary.invoiceNumber}.html`,
                content: invoiceDoc,
              }
            : undefined,
      });
      emailed = receipt.emailed;
    }
    try {
      await notify({
        userId,
        type: "ENROLLMENT_UPDATE",
        title: "Your purchase is confirmed",
        titleAr: "تم تأكيد عملية الشراء",
        body: "Your payment was received and your package is active. Sign in to start.",
        bodyAr: "تم استلام دفعتك وتفعيل باقتك. سجّل الدخول لتبدأ.",
        channels: ["inApp", "email"],
        priority: "HIGH",
        actionUrl: "/student",
        refType: "PurchaseOrder",
        refId: order.id,
      });
    } catch (e) {
      console.error("[fulfil] existing-user notify failed:", e);
    }
  }

  // ── 4. Advance the order + tell the admins what is left to do ──────
  await prisma.purchaseOrder.update({
    where: { id: order.id },
    data: {
      status: "STUDENT_CREATED",
      provisionedStudentId: userId,
      setupUrl: setupUrl ?? null,
      handledAt: new Date(),
      partnerSchoolId: referral.partnerSchoolId,
      partnerCommissionSar: referral.partnerSchoolId ? referral.commissionSar : null,
    },
  });

  await logAudit({
    action: "ORDER_AUTO_FULFILLED",
    entity: "PurchaseOrder",
    entityId: order.id,
    metadata: {
      userId,
      studentId,
      invoiceId: invoiceId ?? null,
      linkedExisting,
      emailed,
      partnerSchoolId: referral.partnerSchoolId,
      partnerCommissionSar: referral.commissionSar,
    },
  });

  try {
    await notifyAdmins({
      type: "ENROLLMENT_UPDATE",
      title: emailed
        ? `${order.studentName} — account created, assign a class`
        : `${order.studentName} — account created, SEND THE LINK`,
      titleAr: emailed
        ? `${order.studentName} — تم إنشاء الحساب، عيّن له فصلاً`
        : `${order.studentName} — تم إنشاء الحساب، أرسل له الرابط`,
      body: emailed
        ? `Paid and set up automatically. The welcome email was sent. Assign a class in /admin/orders.`
        : `Paid and set up automatically, but the welcome email could NOT be sent. Open /admin/orders and send the setup link by WhatsApp.`,
      bodyAr: emailed
        ? `تم الدفع وإنشاء الحساب تلقائياً وأُرسل بريد الترحيب. عيّن له فصلاً من صفحة الطلبات.`
        : `تم الدفع وإنشاء الحساب تلقائياً، لكن بريد الترحيب لم يُرسل. افتح صفحة الطلبات وأرسل له رابط التفعيل عبر واتساب.`,
      channels: ["inApp", "email"],
      priority: emailed ? "HIGH" : "URGENT",
      refType: "PurchaseOrder",
      refId: order.id,
      actionUrl: "/admin/orders",
    });
  } catch (e) {
    console.error("[fulfil] admin notify failed:", e);
  }

  return {
    ok: true,
    userId,
    studentId,
    invoiceId,
    setupUrl,
    emailed,
    linkedExisting,
  };
}

/** Escalate an order that automation deliberately refused to complete. */
async function alertAdminsManualNeeded(
  orderId: string,
  name: string,
  phone: string,
  why: string
): Promise<void> {
  await logAudit({
    action: "ORDER_FULFILMENT_NEEDS_ADMIN",
    entity: "PurchaseOrder",
    entityId: orderId,
    metadata: { reason: why },
  });
  try {
    await notifyAdmins({
      type: "ENROLLMENT_UPDATE",
      title: `Paid order needs you: ${name}`,
      titleAr: `طلب مدفوع يحتاج تدخلك: ${name}`,
      body: `${name} (${phone}) paid but the account could not be created automatically — ${why}. Complete it in /admin/orders.`,
      bodyAr: `${name} (${phone}) دفع لكن تعذّر إنشاء الحساب تلقائياً — ${why}. أكمله من صفحة الطلبات.`,
      channels: ["inApp", "email"],
      priority: "URGENT",
      refType: "PurchaseOrder",
      refId: orderId,
      actionUrl: "/admin/orders",
    });
  } catch (e) {
    console.error("[fulfil] manual-needed alert failed:", e);
  }
}
