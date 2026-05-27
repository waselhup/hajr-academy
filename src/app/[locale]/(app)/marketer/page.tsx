import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getMarketerScope, getMarketerStats } from "@/lib/marketer/scope";
import { ShareCodeBox } from "@/components/marketer/share-code-box";
import { Users, TrendingUp, Wallet, Trophy, Share2, Receipt, Banknote, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

function formatSar(n: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(n);
}

export default async function MarketerDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("MARKETER");
  const t = await getTranslations("Marketer");
  const tStatus = await getTranslations("Marketer");

  const scope = await getMarketerScope(session.user.id);

  if (!scope) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-2xl border border-hajr-border bg-white p-8 text-center">
          <p className="text-hajr-body">
            {locale === "ar"
              ? "حسابك كمسوّق قيد المراجعة. سنخبرك عند التفعيل."
              : "Your marketer account is under review. We'll notify you once active."}
          </p>
        </div>
      </div>
    );
  }

  const isAr = locale === "ar";
  const displayName = isAr ? scope.user.nameAr || scope.user.name : scope.user.name;
  const landingUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/${locale}`
    : `https://hajr.academy/${locale}`;
  const stats = await getMarketerStats(scope.marketerId);

  const recentActivity = await prisma.marketerReferral.findMany({
    where: { marketerId: scope.marketerId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { student: { include: { user: { select: { name: true, nameAr: true } } } } },
  });

  const statusBadge =
    scope.status === "ACTIVE"
      ? "bg-hajr-mint/30 text-hajr-deep-navy"
      : scope.status === "PENDING"
      ? "bg-hajr-warning/20 text-hajr-warning"
      : "bg-hajr-error/15 text-hajr-error";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      {/* Hero */}
      <div className="rounded-2xl bg-hajr-deep-navy p-6 text-white shadow-card-hover md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">
              {t("dashboardTitle", { name: displayName ?? "" })}
            </h1>
            <div className="mt-2 inline-flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge}`}>
                {tStatus(`status_${scope.status}`)}
              </span>
              <span className="text-sm text-white/70">{scope.user.email}</span>
            </div>
          </div>
          <div className="md:w-80">
            <ShareCodeBox code={scope.referralCode} landingUrl={landingUrl} />
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={Users} label={t("statTotalReferrals")} value={String(stats.referralsTotal)} />
        <Kpi
          icon={TrendingUp}
          label={t("statConverted")}
          value={`${stats.converted} (${stats.conversionRate.toFixed(0)}%)`}
        />
        <Kpi icon={Wallet} label={t("statPending")} value={`${formatSar(stats.pendingAmount)} SAR`} />
        <Kpi icon={Trophy} label={t("statEarned")} value={`${formatSar(stats.lifetimeEarned)} SAR`} />
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl border border-hajr-border bg-white p-5 shadow-card">
        <h2 className="mb-4 text-lg font-bold text-hajr-text">
          {isAr ? "آخر النشاطات" : "Recent activity"}
        </h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-hajr-muted">{t("noReferrals")}</p>
        ) : (
          <ul className="space-y-2.5">
            {recentActivity.map((r) => {
              const studentName = r.student
                ? isAr
                  ? r.student.user.nameAr || r.student.user.name
                  : r.student.user.name
                : r.contactEmail || "—";
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg bg-hajr-surface px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        r.converted ? "bg-hajr-success" : "bg-hajr-warning"
                      }`}
                    />
                    <span className="text-hajr-text">{studentName}</span>
                  </div>
                  <span className="text-xs text-hajr-muted">
                    {r.createdAt.toLocaleDateString(isAr ? "ar" : "en")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <QuickAction icon={Share2} href={`/${locale}/marketer`} label={isAr ? "مشاركة الكود" : "Share Code"} />
        <QuickAction icon={Receipt} href={`/${locale}/marketer/commissions`} label={isAr ? "العمولات" : "Commissions"} />
        <QuickAction icon={Banknote} href={`/${locale}/marketer/profile`} label={isAr ? "تعديل البنك" : "Edit Bank"} />
        <QuickAction icon={Mail} href={`/${locale}/messages`} label={isAr ? "راسل الإدارة" : "Contact Admin"} />
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-hajr-border bg-white p-4 shadow-card">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-hajr-ivory">
        <Icon className="h-5 w-5 text-hajr-deep-navy" />
      </div>
      <div className="text-xs text-hajr-muted">{label}</div>
      <div className="mt-1 text-lg font-bold text-hajr-text md:text-xl">{value}</div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  href,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-hajr-border bg-white p-3 text-center shadow-card transition hover:border-hajr-rose hover:shadow-card-hover"
    >
      <Icon className="h-6 w-6 text-hajr-deep-navy group-hover:text-hajr-rose" />
      <span className="text-xs font-medium text-hajr-text">{label}</span>
    </Link>
  );
}
