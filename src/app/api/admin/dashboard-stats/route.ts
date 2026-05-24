import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/dashboard-stats
 * Returns hero-row KPIs with 7-day sparklines and period deltas.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400_000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400_000);

  // 7-day daily buckets, oldest → newest, for sparklines
  const dayBuckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return { start: new Date(d), end: new Date(d.getTime() + 86400_000) };
  });

  const [
    revenueThisMonth,
    revenuePrevMonth,
    activeStudents,
    newStudentsThisWeek,
    liveCount,
    classesThisMonth,
    classesPrevMonth,
    paymentsLast7,
    newStudentsLast7,
    classesLast7,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      _sum: { totalSar: true },
      where: { status: "PAID", paidAt: { gte: monthStart } },
    }),
    prisma.invoice.aggregate({
      _sum: { totalSar: true },
      where: { status: "PAID", paidAt: { gte: prevMonthStart, lte: prevMonthEnd } },
    }),
    prisma.studentProfile.count({ where: { user: { isActive: true } } }),
    prisma.user.count({
      where: { role: "STUDENT", isActive: true, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.classSession.count({ where: { status: "LIVE" } }),
    prisma.classSession.count({
      where: { status: { in: ["COMPLETED", "LIVE"] }, scheduledDate: { gte: monthStart } },
    }),
    prisma.classSession.count({
      where: {
        status: { in: ["COMPLETED", "LIVE"] },
        scheduledDate: { gte: prevMonthStart, lte: prevMonthEnd },
      },
    }),
    // 7-day sparklines via Promise.all over buckets
    Promise.all(
      dayBuckets.map((b) =>
        prisma.invoice.aggregate({
          _sum: { totalSar: true },
          where: { status: "PAID", paidAt: { gte: b.start, lt: b.end } },
        })
      )
    ),
    Promise.all(
      dayBuckets.map((b) =>
        prisma.user.count({
          where: {
            role: "STUDENT",
            createdAt: { gte: b.start, lt: b.end },
          },
        })
      )
    ),
    Promise.all(
      dayBuckets.map((b) =>
        prisma.classSession.count({
          where: {
            status: { in: ["COMPLETED", "LIVE"] },
            scheduledDate: { gte: b.start, lt: b.end },
          },
        })
      )
    ),
  ]);

  const mr = Number(revenueThisMonth._sum.totalSar ?? 0);
  const prevMr = Number(revenuePrevMonth._sum.totalSar ?? 0);
  const revenueDelta = prevMr > 0 ? Math.round(((mr - prevMr) / prevMr) * 100) : 0;
  const classesDelta =
    classesPrevMonth > 0
      ? Math.round(((classesThisMonth - classesPrevMonth) / classesPrevMonth) * 100)
      : 0;

  return NextResponse.json({
    monthRevenue: {
      value: mr,
      delta: revenueDelta,
      sparkline: paymentsLast7.map((a) => Number(a._sum.totalSar ?? 0)),
    },
    activeStudents: {
      value: activeStudents,
      newThisWeek: newStudentsThisWeek,
      sparkline: newStudentsLast7,
    },
    liveClasses: { value: liveCount },
    monthlyClassCount: {
      value: classesThisMonth,
      delta: classesDelta,
      sparkline: classesLast7,
    },
  });
}
