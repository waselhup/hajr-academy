/**
 * Sprint 3 — Ticket detail (chat-style replies).
 */
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { TicketDetail } from "@/components/tickets/TicketDetail";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await requireSession();
  const t = await getTranslations("Tickets");

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          nameAr: true,
          email: true,
          avatar: true,
          role: true,
        },
      },
      assignedTo: {
        select: { id: true, name: true, nameAr: true, avatar: true },
      },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              avatar: true,
              role: true,
            },
          },
        },
      },
    },
  });
  if (!ticket) notFound();

  const isAdmin =
    session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";
  const isRequester = ticket.requesterId === session.user.id;
  const isAssigned = ticket.assignedToId === session.user.id;

  if (!isAdmin && !isRequester && !isAssigned) {
    redirect(`/${locale}/tickets`);
  }

  const visibleReplies = isAdmin
    ? ticket.replies
    : ticket.replies.filter((r) => !r.isInternal);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <a
          href={`/${locale}/tickets`}
          className="text-sm text-hajr-muted hover:text-hajr-rose"
        >
          ← {t("backToList")}
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
          replies: visibleReplies.map((r) => ({
            id: r.id,
            body: r.body,
            isInternal: r.isInternal,
            createdAt: r.createdAt.toISOString(),
            author: r.author,
          })),
        }}
        currentUserId={session.user.id}
        isAdmin={isAdmin}
        locale={locale}
      />
    </div>
  );
}
