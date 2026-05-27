import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

function fmt(n: number | string): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(Number(n));
}

export default async function AdminMarketersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { locale } = await params;
  const sp = await searchParams;
  const isAr = locale === "ar";
  const t = await getTranslations("Marketer");

  const where: { status?: "PENDING" | "ACTIVE" | "SUSPENDED" } = {};
  if (sp.status === "pending") where.status = "PENDING";
  if (sp.status === "active") where.status = "ACTIVE";
  if (sp.status === "suspended") where.status = "SUSPENDED";

  const marketers = await prisma.marketerProfile.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, nameAr: true, email: true, isActive: true, avatar: true } },
      _count: { select: { referrals: true, commissions: true } },
    },
    take: 100,
  });

  // Leaderboard — top 5 by approved+paid commissions last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400_000);
  const topAgg = await prisma.commission.groupBy({
    by: ["marketerId"],
    where: { status: { in: ["APPROVED", "PAID"] }, createdAt: { gte: ninetyDaysAgo } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 5,
  });
  const topIds = topAgg.map((a) => a.marketerId);
  const topMarketers = topIds.length
    ? await prisma.marketerProfile.findMany({
        where: { id: { in: topIds } },
        include: {
          user: { select: { name: true, nameAr: true, avatar: true } },
          _count: { select: { referrals: true } },
        },
      })
    : [];
  const topByEarned = topAgg
    .map((a) => {
      const m = topMarketers.find((x) => x.id === a.marketerId);
      return m ? { ...m, totalEarned90d: Number(a._sum.amount ?? 0) } : null;
    })
    .filter(Boolean) as Array<typeof topMarketers[number] & { totalEarned90d: number }>;

  const counts = await prisma.marketerProfile.groupBy({ by: ["status"], _count: true });
  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-hajr-text">{t("adminMarketers")}</h1>
        <Link
          href={`/${locale}/admin/marketers/commissions`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-hajr-deep-navy px-4 text-sm font-medium text-white"
        >
          <Receipt className="h-4 w-4" />
          {t("adminCommissions")}
        </Link>
      </div>

      {/* Leaderboard */}
      {topByEarned.length > 0 && (
        <section className="rounded-2xl bg-hajr-deep-navy p-5 text-white shadow-card">
          <h2 className="mb-3 text-base font-semibold">{isAr ? "🏆 الأفضل أداءً (٩٠ يوم)" : "🏆 Top performers (90d)"}</h2>
          <ol className="space-y-2">
            {topByEarned.map((m, i) => (
              <li key={m.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-hajr-mint">#{i + 1}</span>
                  <span>{isAr ? m.user.nameAr || m.user.name : m.user.name}</span>
                  <span className="text-xs text-white/60">· {m._count.referrals} refs</span>
                </div>
                <span className="font-bold text-hajr-mint">{fmt(m.totalEarned90d)} SAR</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <FilterPill href={`/${locale}/admin/marketers`} active={!sp.status} label={isAr ? "الكل" : "All"} count={marketers.length} />
        <FilterPill href={`/${locale}/admin/marketers?status=pending`} active={sp.status === "pending"} label={t("status_PENDING")} count={countByStatus.PENDING ?? 0} />
        <FilterPill href={`/${locale}/admin/marketers?status=active`} active={sp.status === "active"} label={t("status_ACTIVE")} count={countByStatus.ACTIVE ?? 0} />
        <FilterPill href={`/${locale}/admin/marketers?status=suspended`} active={sp.status === "suspended"} label={t("status_SUSPENDED")} count={countByStatus.SUSPENDED ?? 0} />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-hajr-border bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-hajr-ivory text-left text-xs uppercase tracking-wider text-hajr-muted">
            <tr>
              <th className="px-4 py-3">{isAr ? "الاسم" : "Name"}</th>
              <th className="px-4 py-3">{isAr ? "الكود" : "Code"}</th>
              <th className="px-4 py-3">{t("status_PENDING")}</th>
              <th className="px-4 py-3">{isAr ? "إحالات" : "Referrals"}</th>
              <th className="px-4 py-3">{isAr ? "ربح" : "Earned"}</th>
              <th className="px-4 py-3">{isAr ? "انضم" : "Joined"}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-hajr-border">
            {marketers.map((m) => {
              const name = isAr ? m.user.nameAr || m.user.name : m.user.name;
              return (
                <tr key={m.id} className="hover:bg-hajr-surface">
                  <td className="px-4 py-3">
                    <div className="font-medium text-hajr-text">{name}</div>
                    <div className="text-xs text-hajr-muted">{m.user.email}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{m.referralCode}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        m.status === "ACTIVE"
                          ? "bg-hajr-mint/30 text-hajr-deep-navy"
                          : m.status === "PENDING"
                          ? "bg-hajr-warning/15 text-hajr-warning"
                          : "bg-hajr-error/15 text-hajr-error"
                      }`}
                    >
                      {t(`status_${m.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-hajr-text">{m._count.referrals}</td>
                  <td className="px-4 py-3 font-medium text-hajr-text">{fmt(m.totalEarned.toString())} SAR</td>
                  <td className="px-4 py-3 text-xs text-hajr-muted">
                    {m.createdAt.toLocaleDateString(isAr ? "ar" : "en")}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Link
                      href={`/${locale}/admin/marketers/${m.id}`}
                      className="rounded-lg border border-hajr-border bg-white px-3 py-1.5 text-xs font-medium text-hajr-text hover:border-hajr-rose"
                    >
                      {isAr ? "تفاصيل" : "Details"}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {marketers.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-sm text-hajr-muted">
                  {isAr ? "لا توجد بيانات" : "No marketers found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterPill({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
        active
          ? "border-hajr-deep-navy bg-hajr-deep-navy text-white"
          : "border-hajr-border bg-white text-hajr-text hover:border-hajr-rose"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-hajr-ivory"}`}>{count}</span>
    </Link>
  );
}
