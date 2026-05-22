import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { InvoiceLineItem } from "@/lib/finance/invoice-pdf";
import { PayInvoiceClient } from "./pay-client";

export const dynamic = "force-dynamic";

/**
 * /student/billing/pay/[invoiceId] — pay a single invoice via Moyasar.
 * Verifies ownership and that the invoice is still payable.
 */
export default async function PayInvoicePage({
  params,
}: {
  params: { locale: string; invoiceId: string };
}) {
  const session = await requireRole("STUDENT");
  const t = await getTranslations("Billing");

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.invoiceId },
    include: { student: { select: { userId: true } } },
  });

  if (!invoice || invoice.student.userId !== session.user.id) {
    redirect(`/${params.locale}/student/billing`);
  }

  // Already paid → straight to the success page.
  if (invoice.status === "PAID") {
    redirect(
      `/${params.locale}/student/billing/success?invoice=${invoice.id}`
    );
  }
  if (invoice.status === "WAIVED") {
    redirect(`/${params.locale}/student/billing`);
  }

  const lineItems = (invoice.lineItems as unknown as InvoiceLineItem[]) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("payInvoice")}</h1>
      <PayInvoiceClient
        invoice={{
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          subtotal: Number(invoice.subtotalSar),
          discount: Number(invoice.discountSar),
          vatAmount: Number(invoice.vatSar),
          totalAmount: Number(invoice.totalSar),
          lineItems,
        }}
      />
    </div>
  );
}
