/**
 * GET /api/admin/analytics/overview — DAU/WAU/MAU + session stats
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  try {
    const now = Date.now();
    const d1 = new Date(now - 86400_000);
    const d7 = new Date(now - 7 * 86400_000);
    const d30 = new Date(now - 30 * 86400_000);

    const [dau, wau, mau, avgDur, totalToday, peakRow] = await Promise.all([
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
      prisma.$queryRawUnsafe<{ hour: number; n: bigint }[]>(`
        SELECT EXTRACT(HOUR FROM "startedAt") AS hour, COUNT(*) AS n
        FROM "UserSession"
        WHERE "startedAt" >= NOW() - INTERVAL '30 days'
        GROUP BY hour
        ORDER BY n DESC
        LIMIT 1
      `).catch(() => []),
    ]);

    const peakHour = peakRow[0] ? Number(peakRow[0].hour) : null;

    return NextResponse.json({
      ok: true,
      overview: {
        dau,
        wau,
        mau,
        avgSessionSec: Math.round(avgDur._avg.durationSec ?? 0),
        totalSessionsToday: totalToday,
        peakHour,
      },
    });
  } catch (e) {
    console.error("[analytics/overview]", e);
    return NextResponse.json({
      ok: true,
      overview: { dau: 0, wau: 0, mau: 0, avgSessionSec: 0, totalSessionsToday: 0, peakHour: null },
    });
  }
}
