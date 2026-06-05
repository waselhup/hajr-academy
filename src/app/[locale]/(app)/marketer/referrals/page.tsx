import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getMarketerScope } from "@/lib/marketer/scope";

export const dynamic = "force-dynamic";

export default async function MarketerReferralsPage({
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

  const referrals = await prisma.marketerReferral.findMany({
    where: { marketerId: scope.marketerId },
    orderBy: { createdAt: "desc" },
    include: {
      student: { include: { user: { select: { name: true, nameAr: true, email: true } } } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-hajr-text">{t("marketerReferralsTitle")}</h1>

      {referrals.length === 0 ? (
        <div className="rounded-2xl border border-hajr-border bg-white p-8 text-center text-sm text-hajr-muted">
          {t("noReferrals")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-hajr-border bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-hajr-ivory text-left text-xs uppercase tracking-wider text-hajr-muted">
              <tr>
                <th className="px-4 py-3">{isAr ? "الاسم/البريد" : "Name/Email"}</th>
                <th className="px-4 py-3">{isAr ? "الكود" : "Code"}</th>
                <th className="px-4 py-3">{isAr ? "محوّل؟" : "Converted"}</th>
                <th className="px-4 py-3">{isAr ? "التاريخ" : "Date"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hajr-border">
              {referrals.map((r) => {
                const name = r.student
                  ? isAr
                    ? r.student.user.nameAr || r.student.user.name
                    : r.student.user.name
                  : r.contactEmail || "—";
                return (
                  <tr key={r.id} className="hover:bg-hajr-surface">
                    <td className="px-4 py-3 text-hajr-text">{name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-hajr-muted">{r.code}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          r.converted ? "bg-hajr-mint/30 text-hajr-deep-navy" : "bg-hajr-warning/15 text-hajr-warning"
                        }`}
                      >
                        {r.converted ? (isAr ? "نعم" : "Yes") : isAr ? "قيد الانتظار" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-hajr-muted">
                      {r.createdAt.toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-GB")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
