/**
 * GET /api/admin/analytics/live — users active in the last 5 minutes.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  try {
    const since = new Date(Date.now() - 5 * 60_000);
    const recent = await prisma.pageVisit.findMany({
      where: { enteredAt: { gte: since } },
      orderBy: { enteredAt: "desc" },
      take: 500,
      select: { userId: true, route: true, enteredAt: true },
    });
    // Latest visit per user
    const byUser = new Map<string, { route: string; at: Date }>();
    for (const v of recent) {
      if (!byUser.has(v.userId)) byUser.set(v.userId, { route: v.route, at: v.enteredAt });
    }
    const userIds = Array.from(byUser.keys());
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, nameAr: true, role: true },
    });
    const live = users.map((u) => {
      const meta = byUser.get(u.id)!;
      return {
        id: u.id,
        name: u.nameAr || u.name,
        role: u.role,
        route: meta.route,
        at: meta.at,
      };
    });
    return NextResponse.json({ ok: true, live, count: live.length });
  } catch (e) {
    console.error("[analytics/live]", e);
    return NextResponse.json({ ok: true, live: [], count: 0 });
  }
}
