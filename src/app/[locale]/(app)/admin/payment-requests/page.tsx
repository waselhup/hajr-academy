import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionButtons } from "./_components/action-buttons";
import { Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPaymentRequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("PaymentReq");
  const isAr = locale === "ar";

  const requests = await prisma.paymentRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      requester: {
        select: { id: true, name: true, nameAr: true, email: true, role: true },
      },
    },
  });

  const groups: Record<string, typeof requests> = {
    PENDING: [],
    APPROVED: [],
    PAID: [],
    REJECTED: [],
  };
  for (const r of requests) {
    groups[r.status].push(r);
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <header>
        <h1 className="text-2xl font-bold text-hajr-deep-navy flex items-center gap-2">
          <Wallet className="h-7 w-7 text-hajr-rose" />
          {t("pageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr
            ? "موافقة طلبات الدفع من المعلمين والمسوّقين"
            : "Approve payment requests from teachers and marketers"}
        </p>
      </header>

      {(["PENDING", "APPROVED", "PAID", "REJECTED"] as const).map((status) => (
        <Card key={status}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-hajr-deep-navy">{status}</h2>
              <Badge variant="outline">{groups[status].length}</Badge>
            </div>
            {groups[status].length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isAr ? "لا توجد طلبات" : "No requests"}
              </p>
            ) : (
              <div className="space-y-2">
                {groups[status].map((r) => (
                  <div
                    key={r.id}
                    className="p-3 border border-hajr-border rounded-md space-y-2"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="font-semibold text-hajr-deep-navy">
                          {Number(r.amount).toFixed(2)} {isAr ? "ر.س" : "SAR"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isAr
                            ? r.requester.nameAr || r.requester.name
                            : r.requester.name}{" "}
                          · {r.requester.role}
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
                      <p className="text-sm">{r.description}</p>
                    ) : null}
                    {r.rejectedReason ? (
                      <p className="text-xs text-hajr-error">
                        {t("rejectReason")}: {r.rejectedReason}
                      </p>
                    ) : null}
                    {r.paidMethod ? (
                      <p className="text-xs text-muted-foreground">
                        {t("paidMethod")}: {r.paidMethod}
                        {r.paidReference ? ` · ${r.paidReference}` : ""}
                      </p>
                    ) : null}
                    {r.status !== "PAID" && r.status !== "REJECTED" ? (
                      <ActionButtons
                        reqId={r.id}
                        status={r.status}
                        locale={locale}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
