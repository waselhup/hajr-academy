import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download } from "lucide-react";
import { WhatsAppRedirect } from "@/components/public/whatsapp-redirect";
import { purchaseWhatsappMessage, whatsappLink } from "@/lib/whatsapp";
import { PACKAGE_LABELS } from "@/lib/packages";

export const dynamic = "force-dynamic";

/**
 * /parent/pay/success — where a parent lands after paying a child's invoice.
 * Mirrors the student billing success page (receipt summary + the WhatsApp
 * hand-off), with the parent↔child link as the ownership check.
 */
export default async function ParentPaySuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ invoice?: string }>;
}) {
  const session = await requireRole("PARENT");
  const { locale } = await params;
  const { invoice: invoiceId } = await searchParams;
  const t = await getTranslations("Billing");
  const isAr = locale === "ar";

  let invoice: {
    invoiceNumber: string;
    totalAmount: number;
    packageType: string | null;
    studentName: string | null;
  } | null = null;

  if (invoiceId) {
    const inv = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        invoiceNumber: true,
        totalSar: true,
        packageType: true,
        studentId: true,
        student: { select: { user: { select: { name: true } } } },
      },
    });
    // Only surface the invoice to a parent actually linked to that child.
    if (inv) {
      const link = await prisma.parentStudentLink.findFirst({
        where: { studentId: inv.studentId, parent: { userId: session.user.id } },
        select: { id: true },
      });
      if (link) {
        invoice = {
          invoiceNumber: inv.invoiceNumber,
          totalAmount: Number(inv.totalSar),
          packageType: inv.packageType,
          studentName: inv.student?.user?.name ?? null,
        };
      }
    }
  }

  const money = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA-u-nu-latn" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const waHref = whatsappLink(
    purchaseWhatsappMessage({
      isAr,
      studentName: invoice?.studentName,
      packageName: invoice?.packageType
        ? PACKAGE_LABELS[invoice.packageType]?.[isAr ? "ar" : "en"] ?? invoice.packageType
        : null,
      amountSar: invoice ? invoice.totalAmount.toFixed(2) : null,
      reference: invoice?.invoiceNumber ?? null,
    })
  );

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
                <span className="text-muted-foreground">{t("invoiceNumber")}</span>
                <span className="num font-medium">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("amount")}</span>
                <span className="num font-bold">
                  {money(invoice.totalAmount)} {isAr ? "ر.س" : "SAR"}
                </span>
              </div>
            </div>
          )}

          <WhatsAppRedirect
            href={waHref}
            isAr={isAr}
            storageKey={`hajr-wa-redirect:${invoiceId ?? "invoice"}`}
          />

          <div className="flex flex-col gap-2">
            {invoice && invoiceId && (
              <Button asChild variant="outline">
                <a
                  href={`/api/invoices/${invoiceId}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="me-2 h-4 w-4" />
                  {t("download")}
                </a>
              </Button>
            )}
            <Button asChild>
              <Link href={`/${locale}/parent/finance`}>{t("goToDashboard")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
