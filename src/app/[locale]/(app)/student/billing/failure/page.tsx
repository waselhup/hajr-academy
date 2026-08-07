import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * /student/billing/failure — payment-failure page with a retry path.
 *
 * Also handles the "pending" outcome (`?pending=1`): the card may well have
 * been charged but we could not verify it in the redirect. Telling that
 * payer their payment failed would invite a second charge, so the copy and
 * the actions differ — no retry button, check-back guidance instead.
 */
export default async function BillingFailurePage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { reason?: string; invoice?: string; pending?: string };
}) {
  await requireRole("STUDENT");
  const t = await getTranslations("Billing");
  const isAr = params.locale === "ar";
  const isPending = searchParams.pending === "1";

  const retryHref = searchParams.invoice
    ? `/${params.locale}/student/billing/pay/${searchParams.invoice}`
    : `/${params.locale}/student/billing`;

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardContent className="space-y-5 p-8 text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              isPending ? "bg-hajr-mint/30" : "bg-hajr-error/10"
            }`}
          >
            {isPending ? (
              <Clock className="h-9 w-9 text-hajr-navy" />
            ) : (
              <XCircle className="h-9 w-9 text-hajr-error" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {isPending
                ? isAr
                  ? "جارٍ تأكيد عملية الدفع"
                  : "Confirming your payment"
                : t("paymentFailed")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isPending
                ? isAr
                  ? "استلمنا عمليتك ولم يكتمل التأكيد بعد. لا تدفع مرة أخرى — سيتم تحديث الفاتورة تلقائياً خلال دقائق، وإن لم يحدث تواصل معنا."
                  : "We received your payment and are still confirming it. Please do not pay again — the invoice updates automatically within a few minutes. Contact us if it does not."
                : t("paymentFailedMsg")}
            </p>
            {searchParams.reason && !isPending && (
              <p className="mt-2 text-xs text-muted-foreground/70">
                {searchParams.reason}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {!isPending && (
              <Button asChild>
                <Link href={retryHref}>{t("retry")}</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href={`/${params.locale}/student/billing`}>
                {t("goToBilling")}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${params.locale}/student/messages`}>
                {t("contactSupport")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
