import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getAvailableEarnings } from "@/lib/payment-requests/service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewRequestForm } from "@/components/payment-requests/new-request-form";
import { Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MarketerPaymentRequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("MARKETER");
  const t = await getTranslations("PaymentReq");
  const isAr = locale === "ar";

  const [requests, available] = await Promise.all([
    prisma.paymentRequest.findMany({
      where: { requesterId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    getAvailableEarnings(session.user.id, "MARKETER"),
  ]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <header>
        <h1 className="text-2xl font-bold text-hajr-deep-navy flex items-center gap-2">
          <Wallet className="h-7 w-7 text-hajr-rose" />
          {t("pageTitle")}
        </h1>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-hajr-navy">
              {available.pendingAmount.toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {isAr ? "بانتظار الموافقة (ر.س)" : "Pending approval (SAR)"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-hajr-rose">
              {available.totalAvailable.toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {isAr ? "متاح للطلب (ر.س)" : "Available to request (SAR)"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-hajr-success">
              {requests.filter((r) => r.status === "PAID").reduce((a, b) => a + Number(b.amount), 0).toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {isAr ? "إجمالي المدفوع (ر.س)" : "Total paid (SAR)"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold text-hajr-deep-navy mb-3">{t("newRequest")}</h2>
          <NewRequestForm available={available.totalAvailable} locale={locale} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold text-hajr-deep-navy">{t("history")}</h2>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              {isAr ? "لا توجد طلبات بعد" : "No requests yet"}
            </p>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="p-3 border border-hajr-border rounded-md min-h-[44px]"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-semibold text-hajr-deep-navy">
                        {Number(r.amount).toFixed(2)} {isAr ? "ر.س" : "SAR"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.periodStart.toISOString().slice(0, 10)} —{" "}
                        {r.periodEnd.toISOString().slice(0, 10)}
                      </div>
                    </div>
                    <Badge
                      className={
                        r.status === "PAID"
                          ? "bg-hajr-success text-white"
                          : r.status === "APPROVED"
                          ? "bg-hajr-rose text-white"
                          : r.status === "REJECTED"
                          ? "bg-hajr-error text-white"
                          : "bg-hajr-warning text-white"
                      }
                    >
                      {r.status}
                    </Badge>
                  </div>
                  {r.description ? (
                    <p className="text-sm mt-2">{r.description}</p>
                  ) : null}
                  {r.rejectedReason ? (
                    <p className="text-xs text-hajr-error mt-1">
                      {t("rejectReason")}: {r.rejectedReason}
                    </p>
                  ) : null}
                  {r.paidMethod ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("paidMethod")}: {r.paidMethod}
                      {r.paidReference ? ` · ${r.paidReference}` : ""}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
