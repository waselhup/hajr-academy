"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { TicketCategoryBadge } from "./TicketCategoryBadge";

interface KanbanTicket {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  aiCategorized: boolean;
  createdAt: string;
  replyCount: number;
  requester: { name: string; nameAr: string | null; avatar: string | null };
}

const COLUMNS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export function TicketKanban({
  tickets,
  locale,
}: {
  tickets: KanbanTicket[];
  locale: string;
}) {
  const t = useTranslations("Tickets");
  const isAr = locale === "ar";
  const [items, setItems] = useState<KanbanTicket[]>(tickets);
  const [dragId, setDragId] = useState<string | null>(null);

  function onDragStart(id: string) {
    setDragId(id);
  }

  async function onDropTo(status: TicketStatus) {
    if (!dragId) return;
    const ticket = items.find((it) => it.id === dragId);
    if (!ticket || ticket.status === status) {
      setDragId(null);
      return;
    }
    // Optimistic.
    setItems((prev) =>
      prev.map((it) => (it.id === dragId ? { ...it, status } : it))
    );
    const res = await fetch(`/api/tickets/${dragId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === dragId ? { ...it, status: ticket.status } : it
        )
      );
    }
    setDragId(null);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const colItems = items.filter((it) => it.status === col);
        return (
          <div
            key={col}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropTo(col)}
            className="flex min-h-[300px] flex-col gap-3 rounded-xl border border-hajr-border bg-hajr-ivory/40 p-3"
          >
            <div className="flex items-center justify-between border-b border-hajr-border pb-2">
              <h3 className="text-sm font-semibold text-hajr-text">
                {t(`status_${col}`)}
              </h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-hajr-muted">
                {colItems.length}
              </span>
            </div>
            {colItems.map((tk) => {
              const requesterName = isAr
                ? tk.requester.nameAr ?? tk.requester.name
                : tk.requester.name;
              return (
                <Link
                  key={tk.id}
                  href={`/${locale}/admin/tickets/${tk.id}`}
                  draggable
                  onDragStart={() => onDragStart(tk.id)}
                  className="cursor-grab rounded-lg border border-hajr-border bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-medium text-hajr-text">
                      {tk.subject}
                    </p>
                    {tk.aiCategorized && (
                      <span className="text-amber-500" title={t("aiTriaged")}>
                        ✨
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <TicketCategoryBadge category={tk.category} />
                    <TicketPriorityBadge priority={tk.priority} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-hajr-muted">
                    <span className="truncate">{requesterName}</span>
                    <span>
                      {tk.replyCount} {t("repliesShort")}
                    </span>
                  </div>
                </Link>
              );
            })}
            {colItems.length === 0 && (
              <p className="text-center text-xs text-hajr-muted">{t("colEmpty")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
