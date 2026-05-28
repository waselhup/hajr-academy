import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function fmtSec(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return `${m}m ${sec}s`;
}

export default async function AnalyticsUserDrilldownPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Analytics");

  let user: { id: string; name: string; nameAr: string | null; email: string; role: string } | null = null;
  let sessions: Array<{
    id: string;
    startedAt: Date;
    endedAt: Date | null;
    durationSec: number;
  }> = [];
  let visits: Array<{ id: string; route: string; enteredAt: Date; durationSec: number }> = [];
  let summary = { totalSessions: 0, totalSec: 0, pagesVisited: 0 };

  try {
    user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, nameAr: true, email: true, role: true },
    });
    if (user) {
      const [s, v, agg] = await Promise.all([
        prisma.userSession.findMany({
          where: { userId: id },
          orderBy: { startedAt: "desc" },
          take: 50,
        }),
        prisma.pageVisit.findMany({
          where: { userId: id },
          orderBy: { enteredAt: "desc" },
          take: 200,
        }),
        prisma.userSession.aggregate({
          _count: { _all: true },
          _sum: { durationSec: true },
          where: { userId: id },
        }),
      ]);
      sessions = s;
      visits = v;
      summary = {
        totalSessions: agg._count._all,
        totalSec: agg._sum.durationSec ?? 0,
        pagesVisited: v.length,
      };
    }
  } catch (e) {
    console.error("[analytics/user-drilldown]", e);
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("userNotFound")}</h1>
        <Button asChild variant="outline">
          <Link href={`/${locale}/admin/analytics`}>{t("backToAnalytics")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-hajr-deep-navy">
            {user.nameAr || user.name}
          </h1>
          <p className="text-sm text-hajr-gray-500">
            {user.email} · <Badge variant="outline">{user.role}</Badge>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${locale}/admin/analytics`}>{t("backToAnalytics")}</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("colSessions")}</div>
            <div className="text-2xl font-bold">{summary.totalSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("colTotalTime")}</div>
            <div className="text-2xl font-bold">{fmtSec(summary.totalSec)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("pagesVisited")}</div>
            <div className="text-2xl font-bold">{summary.pagesVisited}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-hajr-gray-50 text-xs uppercase text-hajr-gray-500">
                <tr>
                  <th className="px-3 py-2 text-start">{t("colRoute")}</th>
                  <th className="px-3 py-2 text-start">{t("colWhen")}</th>
                  <th className="px-3 py-2 text-start">{t("colDuration")}</th>
                </tr>
              </thead>
              <tbody>
                {visits.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-hajr-gray-500">
                      {t("noVisits")}
                    </td>
                  </tr>
                ) : (
                  visits.map((v) => (
                    <tr key={v.id} className="border-t border-hajr-gray-100">
                      <td className="px-3 py-2 font-mono text-xs">{v.route}</td>
                      <td className="px-3 py-2 text-hajr-gray-500">
                        {v.enteredAt.toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{fmtSec(v.durationSec)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
