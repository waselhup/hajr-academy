"use client";

import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, Wallet, FileWarning, AlertOctagon, Users, Percent,
  FileText, RefreshCw, Tag, Undo2,
} from "lucide-react";
import type { FinanceStats, RevenueCharts } from "@/lib/finance/stats";

const COLORS = ["#2C3E50", "#B86E7B", "#B5E5D8", "#D4C5E2", "#F39C12"];

export function AdminFinanceClient({
  stats,
  charts,
}: {
  stats: FinanceStats | null;
  charts: RevenueCharts | null;
}) {
  const t = useTranslations("Finance");
  const locale = useLocale();
  const isAr = locale === "ar";

  const money = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
      maximumFractionDigits: 0,
    }).format(n);
  const sar = isAr ? "ر.س" : "SAR";

  if (!stats || !charts) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          {t("noData")}
        </CardContent>
      </Card>
    );
  }

  const kpis = [
    {
      label: t("mrr"),
      value: `${money(stats.mrr)} ${sar}`,
      icon: TrendingUp,
      tone: "text-hajr-success",
    },
    {
      label: t("revenueMonth"),
      value: `${money(stats.revenueThisMonth)} ${sar}`,
      icon: Wallet,
      tone: "text-hajr-navy",
    },
    {
      label: t("revenueYear"),
      value: `${money(stats.revenueThisYear)} ${sar}`,
      icon: Wallet,
      tone: "text-hajr-navy",
    },
    {
      label: t("outstanding"),
      value: `${stats.outstanding.count} · ${money(stats.outstanding.total)} ${sar}`,
      icon: FileWarning,
      tone: "text-hajr-warning",
    },
    {
      label: t("overdue"),
      value: `${stats.overdue.count} · ${money(stats.overdue.total)} ${sar}`,
      icon: AlertOctagon,
      tone: "text-hajr-error",
    },
    {
      label: t("activeSubscriptions"),
      value: String(stats.activeSubscriptions),
      icon: Users,
      tone: "text-hajr-navy",
    },
    {
      label: t("churnRate"),
      value: `${stats.churnRate}%`,
      icon: Percent,
      tone: stats.churnRate > 10 ? "text-hajr-error" : "text-hajr-success",
    },
  ];

  const navCards = [
    { label: t("invoices"), href: "/admin/finance/invoices", icon: FileText },
    {
      label: t("subscriptions"),
      href: "/admin/finance/subscriptions",
      icon: RefreshCw,
    },
    { label: t("promoCodes"), href: "/admin/finance/promo-codes", icon: Tag },
    { label: t("refunds"), href: "/admin/finance/refunds", icon: Undo2 },
  ];

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {k.label}
                  </span>
                  <Icon className={`h-4 w-4 ${k.tone}`} />
                </div>
                <div className="mt-1 text-xl font-bold num">{k.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick-nav to management pages */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {navCards.map((n) => {
          const Icon = n.icon;
          return (
            <Button
              key={n.href}
              asChild
              variant="outline"
              className="h-auto justify-start py-3"
            >
              <Link href={n.href}>
                <Icon className="me-2 h-4 w-4 text-hajr-rose" />
                {n.label}
              </Link>
            </Button>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Monthly revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("monthlyRevenue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.monthlyRevenue}>
                <XAxis dataKey="month" fontSize={10} tickLine={false} />
                <YAxis fontSize={10} tickLine={false} width={48} />
                <Tooltip
                  formatter={(v) =>
                    [`${money(Number(v))} ${sar}`, t("revenueMonth")] as [string, string]
                  }
                />
                <Bar dataKey="revenue" fill="#B86E7B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by package */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("revenueByPackage")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {charts.revenueByPackage.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                {t("noData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={charts.revenueByPackage}
                    dataKey="revenue"
                    nameKey="packageType"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {charts.revenueByPackage.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => `${money(Number(v))} ${sar}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment methods */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("paymentMethods")}</CardTitle>
          </CardHeader>
          <CardContent>
            {charts.paymentMethods.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                {t("noData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts.paymentMethods} layout="vertical">
                  <XAxis type="number" fontSize={10} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="method"
                    fontSize={10}
                    width={80}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2C3E50" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Subscription flow */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("subscriptionFlow")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.subscriptionFlow}>
                <XAxis dataKey="month" fontSize={10} tickLine={false} />
                <YAxis fontSize={10} tickLine={false} width={40} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="created"
                  name={t("created")}
                  fill="#B5E5D8"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="churned"
                  name={t("churned")}
                  fill="#B86E7B"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
