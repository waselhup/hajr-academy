/**
 * Admin → Activity. A live, segmented view of what users are doing, sourced
 * from the existing AuditLog. Complements /admin/audit-log (the raw,
 * exportable table) with a calmer, real-time, category-filtered stream.
 */
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { categorizeAction } from "@/lib/activity-categories";
import { ActivityClient } from "./_components/activity-client";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
  await requireRole("SUPER_ADMIN", "ADMIN");

  let initialItems: any[] = [];
  try {
    const rows = await prisma.auditLog.findMany({
      include: {
        user: { select: { name: true, nameAr: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    initialItems = rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      action: r.action,
      category: categorizeAction(r.action),
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
  } catch (e) {
    console.error("[admin-activity-page] DB query failed:", e);
  }

  return <ActivityClient initialItems={initialItems} />;
}
