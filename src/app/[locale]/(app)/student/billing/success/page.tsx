import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * /student/billing/success — payment-confirmation page.
 * Shows a receipt summary for the just-settled invoice.
 */
export default async function BillingSuccessPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { invoice?: string };
}) {
  await requireRole("STUDENT");
  const t = await getTranslations("Billing");
  const isAr = params.locale === "ar";

  let invoice: {
    invoiceNumber: string;
    totalAmount: number;
    paidAt: string | null;
  } | null = null;

  if (searchParams.invoice) {
    const inv = await prisma.invoice.findUnique({
      where: { id: searchParams.invoice },
      select: { invoiceNumber: true, totalSar: true, paidAt: true },
    });
    if (inv) {
      invoice = {
        invoiceNumber: inv.invoiceNumber,
        totalAmount: Number(inv.totalSar),
        paidAt: inv.paidAt?.toISOString() ?? null,
      };
    }
  }

  const money = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA-u-nu-latn" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardContent className="space-y-5 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-hajr-mint/30">
            <CheckCircle2 className="h-9 w-9 text-hajr-success" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("paymentSuccess")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("paymentSuccessMsg")}
            </p>
          </div>

          {invoice && (
            <div className="space-y-2 rounded-lg bg-muted/40 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("invoiceNumber")}
                </span>
                <span className="num font-medium">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("amount")}</span>
                <span className="num font-bold">
                  {money(invoice.totalAmount)} {isAr ? "ر.س" : "SAR"}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {invoice && searchParams.invoice && (
              <Button asChild variant="outline">
                <a
                  href={`/api/invoices/${searchParams.invoice}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="me-2 h-4 w-4" />
                  {t("download")}
                </a>
              </Button>
            )}
            <Button asChild>
              <Link href={`/${params.locale}/student`}>
                {t("goToDashboard")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
