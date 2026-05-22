/**
 * Finance reporting aggregates for the admin dashboard.
 *
 * MRR is computed from ACTIVE subscriptions (their VAT-inclusive monthly
 * total). Revenue figures are computed from PAID invoices by `paidAt`.
 * Churn = subscriptions cancelled this month ÷ active at the start of it.
 */

import { prisma } from "@/lib/prisma";

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function monthEnd(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export interface FinanceStats {
  mrr: number;
  revenueThisMonth: number;
  revenueThisQuarter: number;
  revenueThisYear: number;
  outstanding: { count: number; total: number };
  overdue: { count: number; total: number };
  activeSubscriptions: number;
  churnRate: number;
}

/** Headline finance KPIs. */
export async function getFinanceStats(): Promise<FinanceStats> {
  const now = new Date();
  const mStart = monthStart(now);
  const mEnd = monthEnd(now);
  const yStart = new Date(now.getFullYear(), 0, 1);
  const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const qStart = new Date(now.getFullYear(), qStartMonth, 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    activeSubs,
    paidMonth,
    paidQuarter,
    paidYear,
    outstanding,
    overdue,
    cancelledThisMonth,
    activeAtMonthStart,
  ] = await Promise.all([
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      select: { totalWithVat: true },
    }),
    prisma.invoice.findMany({
      where: { status: "PAID", paidAt: { gte: mStart, lt: mEnd } },
      select: { totalSar: true },
    }),
    prisma.invoice.findMany({
      where: { status: "PAID", paidAt: { gte: qStart, lt: mEnd } },
      select: { totalSar: true },
    }),
    prisma.invoice.findMany({
      where: { status: "PAID", paidAt: { gte: yStart } },
      select: { totalSar: true },
    }),
    prisma.invoice.findMany({
      where: { status: "PENDING" },
      select: { totalSar: true },
    }),
    prisma.invoice.findMany({
      where: { status: "OVERDUE" },
      select: { totalSar: true },
    }),
    prisma.subscription.count({
      where: { status: "CANCELLED", cancelledAt: { gte: mStart, lt: mEnd } },
    }),
    // Subs that existed and were not cancelled before this month started.
    prisma.subscription.count({
      where: {
        createdAt: { lt: mStart },
        OR: [{ cancelledAt: null }, { cancelledAt: { gte: prevMonthStart } }],
      },
    }),
  ]);

  const sum = (rows: { totalSar?: unknown; totalWithVat?: unknown }[], key: "totalSar" | "totalWithVat") =>
    +rows.reduce((s, r) => s + Number(r[key] ?? 0), 0).toFixed(2);

  const mrr = sum(activeSubs, "totalWithVat");
  const churnRate =
    activeAtMonthStart > 0
      ? Math.round((cancelledThisMonth / activeAtMonthStart) * 1000) / 10
      : 0;

  return {
    mrr,
    revenueThisMonth: sum(paidMonth, "totalSar"),
    revenueThisQuarter: sum(paidQuarter, "totalSar"),
    revenueThisYear: sum(paidYear, "totalSar"),
    outstanding: {
      count: outstanding.length,
      total: sum(outstanding, "totalSar"),
    },
    overdue: { count: overdue.length, total: sum(overdue, "totalSar") },
    activeSubscriptions: activeSubs.length,
    churnRate,
  };
}

export interface RevenueCharts {
  monthlyRevenue: { month: string; revenue: number }[];
  revenueByPackage: { packageType: string; revenue: number }[];
  paymentMethods: { method: string; count: number; amount: number }[];
  subscriptionFlow: { month: string; created: number; churned: number }[];
}

/** Chart datasets for the finance dashboard (last 12 months). */
export async function getRevenueCharts(): Promise<RevenueCharts> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [paidInvoices, payments, subs] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: "PAID", paidAt: { gte: start } },
      select: { totalSar: true, paidAt: true, packageType: true },
    }),
    prisma.payment.findMany({
      where: { status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] }, paidAt: { gte: start } },
      select: { amount: true, cardBrand: true, moyasarSource: true },
    }),
    prisma.subscription.findMany({
      where: {
        OR: [
          { createdAt: { gte: start } },
          { cancelledAt: { gte: start } },
        ],
      },
      select: { createdAt: true, cancelledAt: true },
    }),
  ]);

  // Build the 12 month buckets.
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const monthlyRevenue = months.map((m) => ({ month: m, revenue: 0 }));
  for (const inv of paidInvoices) {
    if (!inv.paidAt) continue;
    const bucket = monthlyRevenue.find((b) => b.month === key(inv.paidAt!));
    if (bucket) bucket.revenue = +(bucket.revenue + Number(inv.totalSar)).toFixed(2);
  }

  const byPkg: Record<string, number> = {};
  for (const inv of paidInvoices) {
    const p = inv.packageType ?? "OTHER";
    byPkg[p] = +((byPkg[p] ?? 0) + Number(inv.totalSar)).toFixed(2);
  }

  const byMethod: Record<string, { count: number; amount: number }> = {};
  for (const p of payments) {
    const src = p.moyasarSource as { type?: string } | null;
    let method = "CARD";
    if (src?.type === "applepay") method = "APPLE_PAY";
    else if (src?.type === "stcpay") method = "STC_PAY";
    else if (p.cardBrand?.toLowerCase() === "mada") method = "MADA";
    else if (p.cardBrand) method = p.cardBrand.toUpperCase();
    if (!byMethod[method]) byMethod[method] = { count: 0, amount: 0 };
    byMethod[method].count++;
    byMethod[method].amount = +(byMethod[method].amount + Number(p.amount)).toFixed(2);
  }

  const subscriptionFlow = months.map((m) => ({
    month: m,
    created: 0,
    churned: 0,
  }));
  for (const s of subs) {
    const c = subscriptionFlow.find((b) => b.month === key(s.createdAt));
    if (c) c.created++;
    if (s.cancelledAt) {
      const ch = subscriptionFlow.find((b) => b.month === key(s.cancelledAt!));
      if (ch) ch.churned++;
    }
  }

  return {
    monthlyRevenue,
    revenueByPackage: Object.entries(byPkg).map(([packageType, revenue]) => ({
      packageType,
      revenue,
    })),
    paymentMethods: Object.entries(byMethod).map(([method, v]) => ({
      method,
      count: v.count,
      amount: v.amount,
    })),
    subscriptionFlow,
  };
}
