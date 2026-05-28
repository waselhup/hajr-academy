/**
 * GET /api/admin/analytics/pages — top routes by visits & avg time.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  try {
    const rows = await prisma.$queryRawUnsafe<
      { route: string; visits: bigint; unique_users: bigint; avg_sec: number }[]
    >(`
      SELECT
        "route",
        COUNT(*) AS visits,
        COUNT(DISTINCT "userId") AS unique_users,
        AVG("durationSec") AS avg_sec
      FROM "PageVisit"
      WHERE "enteredAt" >= NOW() - INTERVAL '30 days'
      GROUP BY "route"
      ORDER BY visits DESC
      LIMIT 200
    `);
    const pages = rows.map((r) => ({
      route: r.route,
      visits: Number(r.visits),
      uniqueUsers: Number(r.unique_users),
      avgSec: Math.round(Number(r.avg_sec ?? 0)),
    }));
    return NextResponse.json({ ok: true, pages });
  } catch (e) {
    console.error("[analytics/pages]", e);
    return NextResponse.json({ ok: true, pages: [] });
  }
}
