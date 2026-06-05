import { Link } from "@/i18n/routing";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AdminPlacementTestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { locale } = await params;
  const isAr = locale === "ar";

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86400_000);
  const weekAgo = new Date(now.getTime() - 7 * 86400_000);
  const monthAgo = new Date(now.getTime() - 30 * 86400_000);

  const [tests, dayCount, weekCount, monthCount, recent, variantCounts] = await Promise.all([
    prisma.placementTest.findMany({
      include: { _count: { select: { attempts: true, sections: true } } },
      orderBy: { variant: "asc" },
    }),
    prisma.placementAttempt.count({ where: { startedAt: { gte: dayAgo } } }),
    prisma.placementAttempt.count({ where: { startedAt: { gte: weekAgo } } }),
    prisma.placementAttempt.count({ where: { startedAt: { gte: monthAgo } } }),
    prisma.placementAttempt.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        test: { select: { titleEn: true, titleAr: true, variant: true } },
        result: { select: { cefrLevel: true, percent: true, leadCreated: true } },
      },
    }),
    prisma.placementAttempt.groupBy({ by: ["testId"], _count: true }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-hajr-text">{isAr ? "اختبارات تحديد المستوى" : "Placement tests"}</h1>
        <Link
          href="/admin/placement-tests/leads"
          className="inline-flex h-10 items-center rounded-lg bg-hajr-deep-navy px-4 text-sm font-medium text-white"
        >
          {isAr ? "الطلبات المحتملة" : "Leads"}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label={isAr ? "اليوم" : "Today"} value={dayCount} />
        <Stat label={isAr ? "الأسبوع" : "Week"} value={weekCount} />
        <Stat label={isAr ? "الشهر" : "Month"} value={monthCount} />
      </div>

      {/* Test definitions */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {tests.map((t) => (
          <div key={t.id} className="rounded-2xl border border-hajr-border bg-white p-4 shadow-card">
            <h3 className="text-sm font-semibold text-hajr-text">{isAr ? t.titleAr : t.titleEn}</h3>
            <div className="mt-1 text-xs text-hajr-muted">{t.variant}</div>
            <div className="mt-3 text-xs text-hajr-body">
              {t._count.sections} {isAr ? "أقسام" : "sections"} · {t._count.attempts} {isAr ? "محاولة" : "attempts"}
            </div>
            <div className="mt-1 text-xs text-hajr-muted">
              {t.durationMin} min · {t.passingScore}% pass
            </div>
            <Link
              href={`/admin/placement-tests/${t.id}`}
              className="mt-3 inline-block text-xs font-medium text-hajr-rose hover:underline"
            >
              {isAr ? "عرض الإعدادات →" : "View config →"}
            </Link>
          </div>
        ))}
      </div>

      {/* Recent attempts */}
      <div className="overflow-hidden rounded-2xl border border-hajr-border bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-hajr-ivory text-left text-xs uppercase tracking-wider text-hajr-muted">
            <tr>
              <th className="px-3 py-3">{isAr ? "المتقدم" : "Taker"}</th>
              <th className="px-3 py-3">{isAr ? "الاختبار" : "Test"}</th>
              <th className="px-3 py-3">{isAr ? "النتيجة" : "Result"}</th>
              <th className="px-3 py-3">{isAr ? "التاريخ" : "Date"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hajr-border">
            {recent.map((a) => (
              <tr key={a.id} className="hover:bg-hajr-surface">
                <td className="px-3 py-2">
                  <div className="text-hajr-text">{a.guestName || (a.studentId ? "Student" : "—")}</div>
                  <div className="text-xs text-hajr-muted">{a.guestEmail}</div>
                </td>
                <td className="px-3 py-2 text-xs">{isAr ? a.test.titleAr : a.test.titleEn}</td>
                <td className="px-3 py-2">
                  {a.result ? (
                    <span className="text-hajr-text">
                      <b>{a.result.cefrLevel}</b> ({Number(a.result.percent).toFixed(0)}%)
                      {a.result.leadCreated && <span className="ms-2 text-xs text-hajr-rose">⚑ lead</span>}
                    </span>
                  ) : (
                    <span className="text-xs text-hajr-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-hajr-muted">
                  {a.startedAt.toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-GB")}
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-sm text-hajr-muted">
                  {isAr ? "لا توجد محاولات" : "No attempts yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-hajr-border bg-white p-4 shadow-card text-center">
      <div className="text-xs text-hajr-muted">{label}</div>
      <div className="text-2xl font-bold text-hajr-text">{value}</div>
    </div>
  );
}
