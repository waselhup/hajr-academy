import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * /student/billing/failure — payment-failure page with a retry path.
 */
export default async function BillingFailurePage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { reason?: string; invoice?: string };
}) {
  await requireRole("STUDENT");
  const t = await getTranslations("Billing");

  const retryHref = searchParams.invoice
    ? `/${params.locale}/student/billing/pay/${searchParams.invoice}`
    : `/${params.locale}/student/billing`;

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardContent className="space-y-5 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-hajr-error/10">
            <XCircle className="h-9 w-9 text-hajr-error" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("paymentFailed")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("paymentFailedMsg")}
            </p>
            {searchParams.reason && (
              <p className="mt-2 text-xs text-muted-foreground/70">
                {searchParams.reason}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href={retryHref}>{t("retry")}</Link>
            </Button>
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
