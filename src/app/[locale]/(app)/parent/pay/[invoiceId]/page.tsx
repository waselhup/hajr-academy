import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { InvoiceLineItem } from "@/lib/finance/invoice-pdf";
import { PayInvoiceClient } from "@/app/[locale]/(app)/student/billing/pay/[invoiceId]/pay-client";
import { ParentRatingCard } from "@/components/ratings/parent-rating-card";

export const dynamic = "force-dynamic";

/**
 * /parent/pay/[invoiceId] — a parent pays a child's invoice via Moyasar.
 * Reuses the student pay-client; ownership is the parent↔child link.
 */
export default async function ParentPayInvoicePage({
  params,
}: {
  params: Promise<{ locale: string; invoiceId: string }>;
}) {
  const { locale, invoiceId } = await params;
  const session = await requireRole("PARENT");
  const t = await getTranslations("Billing");

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });
  if (!invoice) {
    redirect(`/${locale}/parent/finance`);
  }

  // The caller must be a parent linked to this invoice's student.
  const link = await prisma.parentStudentLink.findFirst({
    where: {
      studentId: invoice.studentId,
      parent: { userId: session.user.id },
      canPay: true,
    },
    select: { id: true },
  });
  if (!link) {
    redirect(`/${locale}/parent/finance`);
  }

  if (invoice.status === "PAID") {
    redirect(`/${locale}/parent/finance`);
  }
  if (invoice.status === "WAIVED") {
    redirect(`/${locale}/parent/finance`);
  }

  const lineItems = (invoice.lineItems as unknown as InvoiceLineItem[]) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("payInvoice")}</h1>
      <ParentRatingCard childId={invoice.studentId} />
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
        successPath={`/${locale}/parent/finance`}
      />
    </div>
  );
}
