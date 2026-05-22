import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminRefundsClient } from "./refunds-client";

export const dynamic = "force-dynamic";

/**
 * /admin/finance/refunds — process refunds and review past ones.
 *
 * Lists refundable PAID payments (so an admin can issue a refund) plus
 * payments that have already been (partially) refunded.
 */
export default async function AdminRefundsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Finance");

  let payments: Awaited<ReturnType<typeof loadPayments>> = [];
  try {
    payments = await loadPayments();
  } catch (e) {
    console.error("[admin-refunds] failed:", e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("refunds")}</h1>
      <AdminRefundsClient payments={payments} />
    </div>
  );
}

async function loadPayments() {
  const rows = await prisma.payment.findMany({
    where: { status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      invoice: {
        include: {
          student: { include: { user: { select: { name: true } } } },
        },
      },
    },
  });
  return rows.map((p) => ({
    paymentId: p.id,
    invoiceNumber: p.invoice.invoiceNumber,
    studentName: p.invoice.student.user.name,
    amount: Number(p.amount),
    refundedAmount: Number(p.refundedAmount),
    status: p.status,
    reason: p.refundReason,
    refundedAt: p.refundedAt?.toISOString() ?? null,
  }));
}
