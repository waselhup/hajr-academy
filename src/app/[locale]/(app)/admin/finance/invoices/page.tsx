import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminInvoicesClient } from "./invoices-client";

export const dynamic = "force-dynamic";

/** /admin/finance/invoices — invoice management table. */
export default async function AdminInvoicesPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Finance");

  let invoices: Awaited<ReturnType<typeof loadInvoices>> = [];
  try {
    invoices = await loadInvoices();
  } catch (e) {
    console.error("[admin-invoices] failed:", e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("invoices")}</h1>
      <AdminInvoicesClient invoices={invoices} />
    </div>
  );
}

async function loadInvoices() {
  const rows = await prisma.invoice.findMany({
    orderBy: { issuedAt: "desc" },
    take: 200,
    include: {
      student: { include: { user: { select: { name: true } } } },
    },
  });
  return rows.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    studentName: inv.student.user.name,
    status: inv.invoiceStatus,
    packageType: inv.packageType,
    totalAmount: Number(inv.totalSar),
    issuedAt: inv.issuedAt.toISOString(),
    dueDate: inv.dueDate.toISOString(),
  }));
}
