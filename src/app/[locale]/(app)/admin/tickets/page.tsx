/**
 * Sprint 3 — Admin tickets kanban (OPEN / IN_PROGRESS / RESOLVED / CLOSED).
 */
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { TicketKanban } from "@/components/tickets/TicketKanban";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Tickets");

  const tickets = await prisma.ticket.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: {
      requester: { select: { name: true, nameAr: true, avatar: true } },
      _count: { select: { replies: true } },
    },
    take: 300,
  });

  const [openCt, inProgCt, resolvedCt, closedCt] = await Promise.all([
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
    prisma.ticket.count({ where: { status: "RESOLVED" } }),
    prisma.ticket.count({ where: { status: "CLOSED" } }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-hajr-text">{t("adminPageTitle")}</h1>
        <p className="mt-1 text-sm text-hajr-muted">{t("adminPageSubtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label={t("kanbanOpen")} value={openCt} color="text-blue-600" />
        <KpiCard label={t("kanbanInProgress")} value={inProgCt} color="text-amber-600" />
        <KpiCard label={t("kanbanResolved")} value={resolvedCt} color="text-emerald-600" />
        <KpiCard label={t("kanbanClosed")} value={closedCt} color="text-slate-500" />
      </div>

      <TicketKanban
        locale={locale}
        tickets={tickets.map((tk) => ({
          id: tk.id,
          subject: tk.subject,
          status: tk.status,
          priority: tk.priority,
          category: tk.category,
          aiCategorized: tk.aiCategorized,
          createdAt: tk.createdAt.toISOString(),
          replyCount: tk._count.replies,
          requester: tk.requester,
        }))}
      />
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-hajr-border bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-hajr-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
