import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { AnalyticsTabs } from "./_components/analytics-tabs";

export const dynamic = "force-dynamic";

function fmtSec(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return `${m}m ${sec}s`;
}

export default async function AdminAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Analytics");

  let overview = { dau: 0, wau: 0, mau: 0, avgSessionSec: 0, totalSessionsToday: 0, peakHour: null as number | null };
  let topUsers: Array<{
    userId: string;
    name: string;
    role: string;
    totalSessions: number;
    totalSec: number;
    lastSeen: Date;
  }> = [];
  let topPages: Array<{ route: string; visits: number; uniqueUsers: number; avgSec: number }> = [];

  try {
    const now = Date.now();
    const d1 = new Date(now - 86400_000);
    const d7 = new Date(now - 7 * 86400_000);
    const d30 = new Date(now - 30 * 86400_000);

    const [dau, wau, mau, avgDur, totalToday, sessions, pages] = await Promise.all([
      prisma.userSession
        .findMany({ where: { startedAt: { gte: d1 } }, select: { userId: true } })
        .then((rs) => new Set(rs.map((r) => r.userId)).size),
      prisma.userSession
        .findMany({ where: { startedAt: { gte: d7 } }, select: { userId: true } })
        .then((rs) => new Set(rs.map((r) => r.userId)).size),
      prisma.userSession
        .findMany({ where: { startedAt: { gte: d30 } }, select: { userId: true } })
        .then((rs) => new Set(rs.map((r) => r.userId)).size),
      prisma.userSession.aggregate({
        _avg: { durationSec: true },
        where: { startedAt: { gte: d30 }, endedAt: { not: null } },
      }),
      prisma.userSession.count({ where: { startedAt: { gte: d1 } } }),
      prisma.userSession.groupBy({
        by: ["userId"],
        where: { startedAt: { gte: d30 } },
        _count: { _all: true },
        _sum: { durationSec: true },
        _max: { startedAt: true },
        orderBy: { _count: { userId: "desc" } },
        take: 30,
      }),
      prisma
        .$queryRawUnsafe<{ route: string; visits: bigint; unique_users: bigint; avg_sec: number }[]>(`
          SELECT "route", COUNT(*) AS visits, COUNT(DISTINCT "userId") AS unique_users, AVG("durationSec") AS avg_sec
          FROM "PageVisit"
          WHERE "enteredAt" >= NOW() - INTERVAL '30 days'
          GROUP BY "route"
          ORDER BY visits DESC
          LIMIT 30
        `)
        .catch(() => []),
    ]);

    overview = {
      dau,
      wau,
      mau,
      avgSessionSec: Math.round(avgDur._avg.durationSec ?? 0),
      totalSessionsToday: totalToday,
      peakHour: null,
    };

    if (sessions.length) {
      const ids = sessions.map((s) => s.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, nameAr: true, role: true },
      });
      const um = new Map(users.map((u) => [u.id, u]));
      topUsers = sessions
        .map((s) => {
          const u = um.get(s.userId);
          return {
            userId: s.userId,
            name: u?.nameAr || u?.name || "—",
            role: (u?.role as string) ?? "—",
            totalSessions: s._count._all,
            totalSec: s._sum.durationSec ?? 0,
            lastSeen: s._max.startedAt ?? new Date(),
          };
        })
        .filter((s) => s.name !== "—");
    }

    topPages = pages.map((p) => ({
      route: p.route,
      visits: Number(p.visits),
      uniqueUsers: Number(p.unique_users),
      avgSec: Math.round(Number(p.avg_sec ?? 0)),
    }));
  } catch (e) {
    console.error("[admin/analytics]", e);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hajr-deep-navy">{t("title")}</h1>
        <p className="text-sm text-hajr-gray-500">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("dau")}</div>
            <div className="text-2xl font-bold">{overview.dau}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("wau")}</div>
            <div className="text-2xl font-bold">{overview.wau}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("mau")}</div>
            <div className="text-2xl font-bold">{overview.mau}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("avgSession")}</div>
            <div className="text-2xl font-bold">{fmtSec(overview.avgSessionSec)}</div>
          </CardContent>
        </Card>
      </div>

      <AnalyticsTabs locale={locale} topUsers={topUsers} topPages={topPages} />
    </div>
  );
}
