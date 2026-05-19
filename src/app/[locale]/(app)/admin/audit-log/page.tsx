import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AuditLogClient } from "./_components/audit-log-client";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; from?: string; to?: string; role?: string; page?: string }>;
}) {
  await requireRole("SUPER_ADMIN", "ADMIN");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const q = (sp.q ?? "").trim();

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
  if (sp.action) {
    if (sp.action === "CREATE") where.action = { contains: "CREATED" };
    else if (sp.action === "UPDATE") where.action = { contains: "UPDATED" };
    else if (sp.action === "DELETE") where.action = { contains: "DELETED" };
    else where.action = sp.action;
  }
  if (sp.role) where.user = { ...(where.user || {}), role: sp.role };
  if (sp.from) where.createdAt = { ...(where.createdAt || {}), gte: new Date(sp.from) };
  if (sp.to) where.createdAt = { ...(where.createdAt || {}), lte: new Date(sp.to) };

  const [total, rows, actionsAgg] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, nameAr: true, email: true, role: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.groupBy({ by: ["action"], _count: { _all: true }, orderBy: { _count: { action: "desc" } }, take: 30 }),
  ]);

  return (
    <AuditLogClient
      rows={rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        metadata: r.metadata as any,
        ipAddress: r.ipAddress,
        user: r.user ? { name: r.user.name, email: r.user.email, role: r.user.role } : null,
      }))}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      actions={actionsAgg.map((a) => ({ value: a.action, count: a._count._all }))}
    />
  );
}
