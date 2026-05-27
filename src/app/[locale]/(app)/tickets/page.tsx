/**
 * Sprint 3 — Universal tickets list (role-aware).
 */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { TicketStatusBadge } from "@/components/tickets/TicketStatusBadge";
import { TicketPriorityBadge } from "@/components/tickets/TicketPriorityBadge";
import { TicketCategoryBadge } from "@/components/tickets/TicketCategoryBadge";

export const dynamic = "force-dynamic";

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireSession();
  const t = await getTranslations("Tickets");
  const isAdmin =
    session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";

  const tickets = await prisma.ticket.findMany({
    where: isAdmin
      ? {}
      : {
          OR: [
            { requesterId: session.user.id },
            { assignedToId: session.user.id },
          ],
        },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: {
      requester: { select: { name: true, nameAr: true } },
      _count: { select: { replies: true } },
    },
    take: 100,
  });

  const isAr = locale === "ar";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-hajr-text">{t("pageTitle")}</h1>
          <p className="mt-1 text-sm text-hajr-muted">{t("pageSubtitle")}</p>
        </div>
        <Link
          href={`/${locale}/tickets/new`}
          className="inline-flex h-11 items-center rounded-lg bg-hajr-rose px-5 text-sm font-medium text-white shadow-sm transition hover:bg-hajr-rose/90"
        >
          {t("newTicket")}
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-xl border border-hajr-border bg-hajr-ivory p-10 text-center">
          <p className="text-hajr-muted">{t("emptyState")}</p>
          <Link
            href={`/${locale}/tickets/new`}
            className="mt-4 inline-flex h-11 items-center rounded-lg bg-hajr-rose px-5 text-sm font-medium text-white"
          >
            {t("createFirst")}
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-hajr-border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-hajr-ivory text-xs uppercase text-hajr-muted">
              <tr>
                <th className="px-4 py-3 text-start">{t("colSubject")}</th>
                <th className="px-4 py-3 text-start">{t("colCategory")}</th>
                <th className="px-4 py-3 text-start">{t("colPriority")}</th>
                <th className="px-4 py-3 text-start">{t("colStatus")}</th>
                <th className="px-4 py-3 text-start">{t("colReplies")}</th>
                <th className="px-4 py-3 text-start">{t("colCreated")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hajr-border">
              {tickets.map((tk) => (
                <tr key={tk.id} className="hover:bg-hajr-ivory/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/${locale}/tickets/${tk.id}`}
                      className="font-medium text-hajr-navy hover:text-hajr-rose"
                    >
                      {tk.subject}
                      {tk.aiCategorized && (
                        <span className="ms-2 text-amber-500" title="AI triaged">✨</span>
                      )}
                    </Link>
                    {isAdmin && (
                      <p className="mt-1 text-xs text-hajr-muted">
                        {isAr ? tk.requester.nameAr ?? tk.requester.name : tk.requester.name}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TicketCategoryBadge category={tk.category} />
                  </td>
                  <td className="px-4 py-3">
                    <TicketPriorityBadge priority={tk.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <TicketStatusBadge status={tk.status} />
                  </td>
                  <td className="px-4 py-3 text-hajr-muted">{tk._count.replies}</td>
                  <td className="px-4 py-3 text-hajr-muted">
                    {new Date(tk.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
