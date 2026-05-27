/**
 * Sprint 3 — Admin ticket detail. Uses the same TicketDetail component
 * as the universal /tickets/[id] page — internal notes are visible because
 * isAdmin=true on this side.
 */
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { TicketDetail } from "@/components/tickets/TicketDetail";

export const dynamic = "force-dynamic";

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Tickets");

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      requester: {
        select: { id: true, name: true, nameAr: true, email: true, avatar: true, role: true },
      },
      assignedTo: { select: { id: true, name: true, nameAr: true, avatar: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: { id: true, name: true, nameAr: true, avatar: true, role: true },
          },
        },
      },
    },
  });
  if (!ticket) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <a
          href={`/${locale}/admin/tickets`}
          className="text-sm text-hajr-muted hover:text-hajr-rose"
        >
          ← {t("backToKanban")}
        </a>
      </div>
      <TicketDetail
        ticket={{
          id: ticket.id,
          subject: ticket.subject,
          body: ticket.body,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          aiCategorized: ticket.aiCategorized,
          createdAt: ticket.createdAt.toISOString(),
          requester: ticket.requester,
          assignedTo: ticket.assignedTo,
          replies: ticket.replies.map((r) => ({
            id: r.id,
            body: r.body,
            isInternal: r.isInternal,
            createdAt: r.createdAt.toISOString(),
            author: r.author,
          })),
        }}
        currentUserId={session.user.id}
        isAdmin
        locale={locale}
      />
    </div>
  );
}
