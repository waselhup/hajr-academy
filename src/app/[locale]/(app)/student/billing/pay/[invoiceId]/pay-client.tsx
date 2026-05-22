"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck } from "lucide-react";
import { MoyasarPaymentForm } from "@/components/finance/MoyasarPaymentForm";
import type { InvoiceLineItem } from "@/lib/finance/invoice-pdf";

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  discount: number;
  vatAmount: number;
  totalAmount: number;
  lineItems: InvoiceLineItem[];
}

export function PayInvoiceClient({
  invoice,
  successPath,
}: {
  invoice: InvoiceData;
  /** Path the user lands on once paid. Defaults to the student success page. */
  successPath?: string;
}) {
  const t = useTranslations("Billing");
  const locale = useLocale();
  const isAr = locale === "ar";

  const money = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  const sar = isAr ? "ر.س" : "SAR";

  return (
    <div className="space-y-6">
      {/* Invoice summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>{t("invoiceSummary")}</span>
            <span className="num text-sm text-muted-foreground">
              {invoice.invoiceNumber}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoice.lineItems.map((li, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{isAr ? li.descriptionAr : li.description}</span>
              <span className="num">
                {money(li.total)} {sar}
              </span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between text-sm">
            <span>{t("subtotal")}</span>
            <span className="num">
              {money(invoice.subtotal)} {sar}
            </span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between text-sm text-hajr-success">
              <span>{t("discount")}</span>
              <span className="num">
                −{money(invoice.discount)} {sar}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>{t("vat")}</span>
            <span className="num">
              {money(invoice.vatAmount)} {sar}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>{t("total")}</span>
            <span className="num">
              {money(invoice.totalAmount)} {sar}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Payment form */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-hajr-mint" />
            {t("securePayment")}
          </div>
          <MoyasarPaymentForm
            amountHalalas={Math.round(invoice.totalAmount * 100)}
            description={`HAJR Academy — ${invoice.invoiceNumber}`}
            invoiceId={invoice.id}
            successUrl={successPath ?? `/${locale}/student/billing/success`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
