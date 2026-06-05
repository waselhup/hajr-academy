import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getMarketerScope } from "@/lib/marketer/scope";

export const dynamic = "force-dynamic";

function fmtSar(d: number | string): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(Number(d));
}

export default async function MarketerCommissionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("MARKETER");
  const t = await getTranslations("Marketer");
  const isAr = locale === "ar";

  const scope = await getMarketerScope(session.user.id);
  if (!scope) {
    return <div className="p-6 text-hajr-body">{isAr ? "حسابك قيد المراجعة" : "Account under review"}</div>;
  }

  const commissions = await prisma.commission.findMany({
    where: { marketerId: scope.marketerId },
    orderBy: { createdAt: "desc" },
    include: {
      student: { include: { user: { select: { name: true, nameAr: true } } } },
      invoice: { select: { invoiceNumber: true, totalSar: true } },
    },
  });

  const groups: Record<string, typeof commissions> = {
    PENDING: [],
    APPROVED: [],
    PAID: [],
    REJECTED: [],
  };
  for (const c of commissions) groups[c.status].push(c);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-hajr-text">{t("marketerCommissionsTitle")}</h1>

      {(["PENDING", "APPROVED", "PAID", "REJECTED"] as const).map((status) => (
        <section key={status} className="rounded-2xl border border-hajr-border bg-white p-4 shadow-card">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-hajr-text">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                status === "PAID"
                  ? "bg-hajr-success"
                  : status === "APPROVED"
                  ? "bg-hajr-info"
                  : status === "REJECTED"
                  ? "bg-hajr-error"
                  : "bg-hajr-warning"
              }`}
            />
            {t(`status_${status}`)}
            <span className="text-xs text-hajr-muted">({groups[status].length})</span>
          </h2>
          {groups[status].length === 0 ? (
            <p className="text-xs text-hajr-muted">—</p>
          ) : (
            <ul className="divide-y divide-hajr-border">
              {groups[status].map((c) => {
                const name = isAr ? c.student.user.nameAr || c.student.user.name : c.student.user.name;
                return (
                  <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <div className="font-medium text-hajr-text">{name}</div>
                      <div className="text-xs text-hajr-muted">
                        {c.invoice.invoiceNumber} · {isAr ? "إجمالي" : "Invoice"}: {fmtSar(c.invoice.totalSar.toString())} SAR
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-hajr-text">{fmtSar(c.amount.toString())} SAR</div>
                      <div className="text-xs text-hajr-muted">
                        {(Number(c.rateApplied) * 100).toFixed(0)}% · {c.createdAt.toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-GB")}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
