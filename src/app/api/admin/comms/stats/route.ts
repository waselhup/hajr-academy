import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SMS_COST_SAR = 0.05; // per SMS

/**
 * GET /api/admin/comms/stats — message volume, delivery rates, channel
 * breakdown, SMS cost, and a 30-day daily volume series.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now.getTime() - 7 * 86400_000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000);

    const [today, week, month, all, monthSms] = await Promise.all([
      prisma.message.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.message.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.message.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.message.findMany({
        select: { channel: true, status: true },
      }),
      prisma.message.count({
        where: { channel: "SMS", createdAt: { gte: monthStart }, status: "SENT" },
      }),
    ]);

    // Per-channel delivery rate.
    const byChannel: Record<
      string,
      { total: number; sent: number; failed: number }
    > = {};
    for (const m of all) {
      byChannel[m.channel] ??= { total: 0, sent: 0, failed: 0 };
      byChannel[m.channel].total++;
      if (m.status === "SENT" || m.status === "DELIVERED" || m.status === "READ") {
        byChannel[m.channel].sent++;
      }
      if (m.status === "FAILED") byChannel[m.channel].failed++;
    }
    const channels = Object.entries(byChannel).map(([channel, c]) => ({
      channel,
      total: c.total,
      sent: c.sent,
      failed: c.failed,
      deliveryRate: c.total > 0 ? Math.round((c.sent / c.total) * 100) : 0,
    }));

    const totalFailed = all.filter((m) => m.status === "FAILED").length;

    // 30-day daily volume (per channel).
    const recent = await prisma.message.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { channel: true, createdAt: true },
    });
    const dailyMap = new Map<string, Record<string, number>>();
    for (const m of recent) {
      const day = m.createdAt.toISOString().slice(0, 10);
      const row = dailyMap.get(day) ?? {};
      row[m.channel] = (row[m.channel] ?? 0) + 1;
      dailyMap.set(day, row);
    }
    const daily = [...dailyMap.entries()]
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      volume: { today, week, month },
      channels,
      totalFailed,
      smsCostSar: Math.round(monthSms * SMS_COST_SAR * 100) / 100,
      smsCountMonth: monthSms,
      daily,
    });
  } catch (e) {
    console.error("[api/admin/comms/stats] failed:", e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
