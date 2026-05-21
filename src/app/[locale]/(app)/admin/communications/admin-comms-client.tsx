"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, MessageSquare, AlertTriangle, Wallet, FileText, ScrollText } from "lucide-react";

interface Stats {
  volume: { today: number; week: number; month: number };
  channels: {
    channel: string;
    total: number;
    sent: number;
    failed: number;
    deliveryRate: number;
  }[];
  totalFailed: number;
  smsCostSar: number;
  smsCountMonth: number;
  daily: Record<string, number>[];
}

export function AdminCommsClient() {
  const t = useTranslations("Comms");
  const locale = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/comms/stats");
        if (res.ok) setStats(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-brand-rose" />
      </div>
    );
  }
  if (!stats) {
    return <p className="text-sm text-muted-foreground">{t("noData")}</p>;
  }

  // Daily volume chart scaling.
  const maxDaily = Math.max(
    1,
    ...stats.daily.map((d) =>
      Object.entries(d)
        .filter(([k]) => k !== "date")
        .reduce((s, [, v]) => s + (v as number), 0)
    )
  );

  return (
    <div className="space-y-6">
      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/${locale}/admin/communications/templates`}>
            <FileText className="me-2 h-4 w-4" />
            {t("templates")}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/${locale}/admin/communications/logs`}>
            <ScrollText className="me-2 h-4 w-4" />
            {t("logs")}
          </Link>
        </Button>
      </div>

      {/* Volume cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={MessageSquare}
          label={t("sentToday")}
          value={stats.volume.today}
        />
        <StatCard
          icon={MessageSquare}
          label={t("sentWeek")}
          value={stats.volume.week}
        />
        <StatCard
          icon={Mail}
          label={t("sentMonth")}
          value={stats.volume.month}
        />
        <StatCard
          icon={Wallet}
          label={t("smsCost")}
          value={`${stats.smsCostSar} SAR`}
          sub={`${stats.smsCountMonth} ${t("smsSent")}`}
        />
      </div>

      {/* Delivery by channel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("deliveryByChannel")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.channels.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          )}
          {stats.channels.map((c) => (
            <div key={c.channel}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{c.channel}</span>
                <span className="num text-muted-foreground">
                  {c.sent}/{c.total} · {c.deliveryRate}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-brand-mint"
                  style={{ width: `${c.deliveryRate}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Failures */}
      {stats.totalFailed > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-sm text-red-700">
              {stats.totalFailed} {t("failedMessages")}
            </span>
            <Button asChild size="sm" variant="outline" className="ms-auto">
              <Link href={`/${locale}/admin/communications/logs?status=FAILED`}>
                {t("review")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Daily volume chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dailyVolume")}</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.daily.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          ) : (
            <div className="flex items-end gap-1 overflow-x-auto pb-2">
              {stats.daily.map((d) => {
                const total = Object.entries(d)
                  .filter(([k]) => k !== "date")
                  .reduce((s, [, v]) => s + (v as number), 0);
                return (
                  <div
                    key={d.date as unknown as string}
                    className="flex min-w-6 flex-col items-center gap-1"
                    title={`${d.date}: ${total}`}
                  >
                    <div
                      className="w-4 rounded-t bg-brand-rose"
                      style={{
                        height: `${Math.max(2, (total / maxDaily) * 120)}px`,
                      }}
                    />
                    <span className="text-[9px] text-gray-400">
                      {String(d.date).slice(8, 10)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-lavender/40">
          <Icon className="h-5 w-5 text-brand-navy" />
        </div>
        <div>
          <div className="text-2xl font-bold num">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
          {sub && <div className="text-[11px] text-gray-400 num">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
