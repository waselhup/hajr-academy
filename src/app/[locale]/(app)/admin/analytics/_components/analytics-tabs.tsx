"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type User = {
  userId: string;
  name: string;
  role: string;
  totalSessions: number;
  totalSec: number;
  lastSeen: Date | string;
};

type PageRow = {
  route: string;
  visits: number;
  uniqueUsers: number;
  avgSec: number;
};

type LiveRow = {
  id: string;
  name: string;
  role: string;
  route: string;
  at: string;
};

function fmtSec(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return `${m}m ${sec}s`;
}

export function AnalyticsTabs({
  locale,
  topUsers,
  topPages,
}: {
  locale: string;
  topUsers: User[];
  topPages: PageRow[];
}) {
  const t = useTranslations("Analytics");
  const [tab, setTab] = useState<"overview" | "users" | "pages" | "live">("users");
  const [live, setLive] = useState<LiveRow[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);

  useEffect(() => {
    if (tab !== "live") return;
    let cancelled = false;
    async function fetchLive() {
      setLiveLoading(true);
      try {
        const r = await fetch("/api/admin/analytics/live", { cache: "no-store" });
        const j = await r.json();
        if (!cancelled && j.ok) setLive(j.live ?? []);
      } catch {
        if (!cancelled) setLive([]);
      } finally {
        if (!cancelled) setLiveLoading(false);
      }
    }
    fetchLive();
    const id = setInterval(fetchLive, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tab]);

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as never)}>
      <TabsList>
        <TabsTrigger value="overview">{t("tabOverview")}</TabsTrigger>
        <TabsTrigger value="users">{t("tabUsers")}</TabsTrigger>
        <TabsTrigger value="pages">{t("tabPages")}</TabsTrigger>
        <TabsTrigger value="live">{t("tabLive")}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <Card>
          <CardContent className="space-y-2 p-6 text-sm text-hajr-gray-600">
            <p>{t("overviewBlurb")}</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="users" className="mt-4">
        {topUsers.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-hajr-gray-500">
              {t("emptyUsers")}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-hajr-gray-50 text-xs uppercase text-hajr-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-start">{t("colName")}</th>
                      <th className="px-3 py-2 text-start">{t("colRole")}</th>
                      <th className="px-3 py-2 text-start">{t("colSessions")}</th>
                      <th className="px-3 py-2 text-start">{t("colTotalTime")}</th>
                      <th className="px-3 py-2 text-start">{t("colLastSeen")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((u) => (
                      <tr key={u.userId} className="border-t border-hajr-gray-100">
                        <td className="px-3 py-2">
                          <Link
                            href={`/admin/analytics/users/${u.userId}`}
                            className="font-medium text-hajr-rose hover:underline"
                          >
                            {u.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-hajr-gray-500">{u.role}</td>
                        <td className="px-3 py-2">{u.totalSessions}</td>
                        <td className="px-3 py-2">{fmtSec(u.totalSec)}</td>
                        <td className="px-3 py-2 text-hajr-gray-500">
                          {new Date(u.lastSeen).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="pages" className="mt-4">
        {topPages.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-hajr-gray-500">
              {t("emptyPages")}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-hajr-gray-50 text-xs uppercase text-hajr-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-start">{t("colRoute")}</th>
                      <th className="px-3 py-2 text-start">{t("colVisits")}</th>
                      <th className="px-3 py-2 text-start">{t("colUnique")}</th>
                      <th className="px-3 py-2 text-start">{t("colAvgTime")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPages.map((p) => (
                      <tr key={p.route} className="border-t border-hajr-gray-100">
                        <td className="px-3 py-2 font-mono text-xs">{p.route}</td>
                        <td className="px-3 py-2">{p.visits}</td>
                        <td className="px-3 py-2">{p.uniqueUsers}</td>
                        <td className="px-3 py-2">{fmtSec(p.avgSec)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="live" className="mt-4">
        <div className="mb-3 text-xs text-hajr-gray-500">
          {t("liveCaption")} · {live.length} {t("liveOnline")}
        </div>
        {liveLoading && live.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-hajr-gray-500">
              {t("loading")}
            </CardContent>
          </Card>
        ) : live.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-hajr-gray-500">
              {t("emptyLive")}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-hajr-gray-50 text-xs uppercase text-hajr-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-start">{t("colName")}</th>
                      <th className="px-3 py-2 text-start">{t("colRole")}</th>
                      <th className="px-3 py-2 text-start">{t("colRoute")}</th>
                      <th className="px-3 py-2 text-start">{t("colSince")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {live.map((r) => (
                      <tr key={r.id} className="border-t border-hajr-gray-100">
                        <td className="px-3 py-2">
                          <Link
                            href={`/admin/analytics/users/${r.id}`}
                            className="font-medium text-hajr-rose hover:underline"
                          >
                            {r.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline">{r.role}</Badge>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{r.route}</td>
                        <td className="px-3 py-2 text-hajr-gray-500">
                          {new Date(r.at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
