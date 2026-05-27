/**
 * Auto-commission engine.
 *
 * `maybeCreateCommissionForInvoice(invoiceId)` is the idempotent entry
 * point called by markInvoicePaid + the Moyasar reconcile path. It only
 * creates a Commission when:
 *
 *  1. The invoice is currently PAID
 *  2. It is the student's FIRST paid invoice (count(PAID where studentId)===1)
 *  3. The student's user has a `referredByCode` resolving to an ACTIVE
 *     MarketerProfile
 *  4. No existing Commission row exists for this invoice
 *
 * Amount = invoice.totalSar * marketer.commissionRate.
 *
 * On success: marks the matching MarketerReferral converted=true,
 * audits, and notifies the marketer.
 */
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { audit } from "@/lib/audit";

export async function maybeCreateCommissionForInvoice(invoiceId: string): Promise<{
  created: boolean;
  reason?: string;
  commissionId?: string;
}> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      studentId: true,
      status: true,
      totalSar: true,
      invoiceNumber: true,
    },
  });
  if (!invoice) return { created: false, reason: "invoice_not_found" };
  if (invoice.status !== "PAID") return { created: false, reason: "not_paid" };

  // Already commissioned?
  const existing = await prisma.commission.findUnique({ where: { invoiceId } });
  if (existing) return { created: false, reason: "already_exists", commissionId: existing.id };

  // First paid invoice? Count strictly PAID invoices for this student.
  const paidCount = await prisma.invoice.count({
    where: { studentId: invoice.studentId, status: "PAID" },
  });
  if (paidCount !== 1) return { created: false, reason: "not_first_paid" };

  // Resolve the student's user + referral code.
  const student = await prisma.studentProfile.findUnique({
    where: { id: invoice.studentId },
    select: { id: true, user: { select: { id: true, referredByCode: true, name: true } } },
  });
  if (!student?.user.referredByCode) return { created: false, reason: "no_referral" };

  const marketer = await prisma.marketerProfile.findFirst({
    where: { referralCode: student.user.referredByCode, status: "ACTIVE" },
    include: { user: { select: { id: true, email: true, name: true, phone: true, preferredLang: true } } },
  });
  if (!marketer) return { created: false, reason: "marketer_not_active" };

  const totalSar = Number(invoice.totalSar);
  const rate = Number(marketer.commissionRate);
  const amount = Math.round(totalSar * rate * 100) / 100;

  const commission = await prisma.commission.create({
    data: {
      marketerId: marketer.id,
      studentId: student.id,
      invoiceId: invoice.id,
      amount,
      rateApplied: rate,
      status: "PENDING",
    },
  });

  // Mark referral as converted.
  await prisma.marketerReferral.updateMany({
    where: {
      marketerId: marketer.id,
      OR: [{ studentId: student.id }, { code: student.user.referredByCode }],
      converted: false,
    },
    data: { converted: true, convertedAt: new Date(), studentId: student.id },
  });

  await audit.mutation(null, "COMMISSION_CREATED", "Commission", commission.id, {
    invoiceId: invoice.id,
    marketerId: marketer.id,
    amount,
    rate,
  });

  // Notify the marketer.
  await notify({
    userId: marketer.userId,
    type: "COMMISSION_UPDATE",
    title: "New commission earned",
    titleAr: "تم تسجيل عمولة جديدة",
    body: `You earned ${amount} SAR commission from a converted referral.`,
    bodyAr: `حصلت على ${amount} ريال عمولة من إحالة محوّلة.`,
    channels: ["inApp"],
    actionUrl: "/marketer/commissions",
    actionLabel: "View",
    actionLabelAr: "عرض",
    priority: "NORMAL",
    refType: "Commission",
    refId: commission.id,
  });

  return { created: true, commissionId: commission.id };
}
