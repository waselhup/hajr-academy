"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { TicketCategory, TicketPriority, TicketStatus, Role } from "@prisma/client";
import { createSupabaseClient } from "@/lib/supabase";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { TicketCategoryBadge } from "./TicketCategoryBadge";

interface Reply {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    nameAr: string | null;
    avatar: string | null;
    role: Role;
  };
}

interface TicketDetailProps {
  ticket: {
    id: string;
    subject: string;
    body: string;
    category: TicketCategory;
    priority: TicketPriority;
    status: TicketStatus;
    aiCategorized: boolean;
    createdAt: string;
    requester: {
      id: string;
      name: string;
      nameAr: string | null;
      avatar: string | null;
      role: Role;
    };
    assignedTo: {
      id: string;
      name: string;
      nameAr: string | null;
      avatar: string | null;
    } | null;
    replies: Reply[];
  };
  currentUserId: string;
  isAdmin: boolean;
  locale: string;
}

export function TicketDetail({ ticket, currentUserId, isAdmin, locale }: TicketDetailProps) {
  const t = useTranslations("Tickets");
  const isAr = locale === "ar";

  const [replies, setReplies] = useState<Reply[]>(ticket.replies);
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  // Subscribe to realtime replies.
  useEffect(() => {
    const supabase = createSupabaseClient();
    const ch = supabase.channel(`ticket:${ticket.id}`, {
      config: { broadcast: { ack: false } },
    });

    ch.on("broadcast", { event: "reply" }, (payload) => {
      const incoming = payload.payload as Reply;
      // Skip if it's already there (we just posted) — match by id.
      setReplies((prev) =>
        prev.some((r) => r.id === incoming.id) ? prev : [...prev, incoming]
      );
    });

    ch.subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [ticket.id]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/tickets/${ticket.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: replyText, isInternal }),
    });
    if (res.ok) {
      const data = await res.json();
      // Append optimistically (broadcast may also arrive — dedupe by id).
      setReplies((prev) =>
        prev.some((r) => r.id === data.reply.id) ? prev : [...prev, data.reply]
      );
      setReplyText("");
      setIsInternal(false);
    }
    setSending(false);
  }

  async function changeStatus(newStatus: TicketStatus) {
    const prev = status;
    setStatus(newStatus);
    const res = await fetch(`/api/tickets/${ticket.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) setStatus(prev);
  }

  const requesterName = isAr
    ? ticket.requester.nameAr ?? ticket.requester.name
    : ticket.requester.name;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-hajr-border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-hajr-text">
              {ticket.subject}
              {ticket.aiCategorized && (
                <span className="ms-2 text-amber-500" title={t("aiTriaged")}>
                  ✨
                </span>
              )}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <TicketCategoryBadge category={ticket.category} />
              <TicketPriorityBadge priority={ticket.priority} />
              <TicketStatusBadge status={status} />
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-hajr-border pt-4">
          <div className="flex items-center gap-2 text-sm text-hajr-muted">
            <span className="font-medium text-hajr-text">{requesterName}</span>
            <span>·</span>
            <span>{new Date(ticket.createdAt).toLocaleString(isAr ? "ar-SA" : "en-US")}</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-hajr-text">
            {ticket.body}
          </p>
        </div>

        {isAdmin && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-hajr-border pt-4">
            {(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as TicketStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                disabled={s === status}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                  s === status
                    ? "border-hajr-navy bg-hajr-navy text-white"
                    : "border-hajr-border bg-white text-hajr-text hover:bg-hajr-ivory"
                }`}
              >
                {t(`status_${s}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reply thread */}
      <div className="space-y-3">
        {replies.length === 0 ? (
          <p className="text-center text-sm text-hajr-muted">{t("noReplies")}</p>
        ) : (
          replies.map((r) => {
            const isMine = r.author.id === currentUserId;
            const authorName = isAr ? r.author.nameAr ?? r.author.name : r.author.name;
            return (
              <div
                key={r.id}
                className={`rounded-xl border p-4 shadow-sm ${
                  r.isInternal
                    ? "border-amber-200 bg-amber-50"
                    : isMine
                    ? "border-hajr-rose/30 bg-hajr-rose/5 ms-auto"
                    : "border-hajr-border bg-white"
                } max-w-[85%]`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-hajr-text">{authorName}</span>
                    <span className="text-hajr-muted">·</span>
                    <span className="text-hajr-muted">
                      {new Date(r.createdAt).toLocaleString(isAr ? "ar-SA" : "en-US")}
                    </span>
                    {r.isInternal && (
                      <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                        {t("internalNote")}
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-hajr-text">{r.body}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Reply composer */}
      {status !== "CLOSED" && (
        <form
          onSubmit={sendReply}
          className="space-y-3 rounded-xl border border-hajr-border bg-white p-4 shadow-sm"
        >
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            placeholder={t("replyPlaceholder")}
            className="w-full rounded-lg border border-hajr-border bg-white px-3 py-2 text-sm focus:border-hajr-rose focus:outline-none focus:ring-2 focus:ring-hajr-rose/30"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            {isAdmin && (
              <label className="flex items-center gap-2 text-xs text-hajr-muted">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="h-4 w-4 rounded border-hajr-border"
                />
                {t("markInternal")}
              </label>
            )}
            <button
              type="submit"
              disabled={sending || !replyText.trim()}
              className="ms-auto inline-flex h-11 items-center rounded-lg bg-hajr-rose px-5 text-sm font-medium text-white shadow-sm transition hover:bg-hajr-rose/90 disabled:opacity-60"
            >
              {sending ? t("sending") : t("sendReply")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
