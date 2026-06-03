/**
 * GET /api/admin/activity — recent user activity, newest first, segmented by
 * category. Powers the live admin Activity view (auto-refreshed client-side).
 *
 * Source: the existing AuditLog table (no new logging layer) — the same data
 * the /admin/audit-log page already exposes, reshaped + classified by area.
 *
 * Query params:
 *   q        — free text over action/entity/entityId/user name+email
 *   category — one of ACTIVITY_CATEGORIES ("all" = no filter)
 *   role     — filter by the actor's role
 *   limit    — max rows (default 60, capped 200)
 *
 * Admin/super-admin only. Exposes nothing beyond what audit-log already shows.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  categorizeAction,
  categoryActionFilter,
  type ActivityCategory,
} from "@/lib/activity-categories";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const category = searchParams.get("category") ?? "all";
  const role = searchParams.get("role") ?? "";
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "60", 10)));

  const where: any = {};
  if (q) {
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { entity: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (role) where.user = { ...(where.user || {}), role };

  const actionFilter = categoryActionFilter(category);
  if (actionFilter) {
    // AND the category constraint alongside any free-text OR.
    where.AND = [{ OR: actionFilter }];
  }

  try {
    // For "other" we over-fetch then filter in code (it's the negation of all
    // rules and not cheaply expressible as a Prisma clause).
    const take = category === "other" ? Math.min(400, limit * 4) : limit;
    const rows = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { name: true, nameAr: true, email: true, role: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    let items = rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      action: r.action,
      category: categorizeAction(r.action) as ActivityCategory,
      entity: r.entity,
      entityId: r.entityId,
      ipAddress: r.ipAddress,
      user: r.user
        ? {
            name: r.user.name,
            nameAr: r.user.nameAr,
            email: r.user.email,
            role: r.user.role,
          }
        : null,
    }));

    if (category === "other") items = items.filter((i) => i.category === "other").slice(0, limit);

    return NextResponse.json({ ok: true, items, count: items.length });
  } catch (e) {
    console.error("[admin/activity]", e);
    return NextResponse.json({ ok: true, items: [], count: 0 });
  }
}
