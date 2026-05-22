"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2, Search, MessagesSquare, Flag, FileDown, ShieldAlert, Eye,
} from "lucide-react";
import { fmtRiyadh } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Participant {
  id: string;
  name: string;
  role: string;
}
interface ThreadRow {
  threadId: string;
  participants: Participant[];
  lastMessage: string;
  lastAt: string;
  messageCount: number;
  flaggedCount: number;
}
interface ViewMessage {
  id: string;
  fromUserId: string;
  fromName: string;
  fromRole: string;
  body: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  createdAt: string;
  readAt: string | null;
  flagged: boolean;
  flagReason: string | null;
}

function roleVariant(role: string): "navy" | "info" | "success" | "default" {
  if (role === "TEACHER") return "info";
  if (role === "PARENT") return "success";
  if (role === "STUDENT") return "default";
  return "navy";
}

export function ChatsClient() {
  const t = useTranslations("AdminComms");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [rows, setRows] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [openThread, setOpenThread] = useState<ThreadRow | null>(null);
  const [viewMessages, setViewMessages] = useState<ViewMessage[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [flagging, setFlagging] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      if (roleFilter) p.set("role", roleFilter);
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      const res = await fetch(`/api/admin/communications/chats?${p}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.conversations);
      }
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter, from, to]);

  useEffect(() => {
    const tid = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(tid);
  }, [load, q]);

  async function openConversation(row: ThreadRow) {
    setOpenThread(row);
    setViewLoading(true);
    setViewMessages([]);
    try {
      const res = await fetch(
        `/api/admin/communications/chats/${row.threadId}`
      );
      if (res.ok) {
        const data = await res.json();
        setViewMessages(data.messages);
      }
    } finally {
      setViewLoading(false);
    }
  }

  async function toggleFlag(m: ViewMessage) {
    if (!openThread) return;
    setFlagging(m.id);
    try {
      const reason = m.flagged
        ? undefined
        : window.prompt(t("flagReasonPrompt")) || t("flagReasonDefault");
      const res = await fetch(
        `/api/admin/communications/chats/${openThread.threadId}/flag`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageId: m.id,
            flagged: !m.flagged,
            reason,
          }),
        }
      );
      if (res.ok) {
        setViewMessages((prev) =>
          prev.map((x) =>
            x.id === m.id
              ? { ...x, flagged: !x.flagged, flagReason: x.flagged ? null : reason ?? null }
              : x
          )
        );
        load();
      }
    } finally {
      setFlagging(null);
    }
  }

  /** Export the open conversation as a printable PDF (browser print pipeline). */
  function exportPdf() {
    if (!openThread) return;
    const names = openThread.participants.map((p) => p.name).join(" ↔ ");
    const dir = isAr ? "rtl" : "ltr";
    const rowsHtml = viewMessages
      .map(
        (m) => `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;white-space:nowrap;font-size:12px;color:#64748B;">${fmtRiyadh(m.createdAt, "yyyy-MM-dd HH:mm")}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:13px;font-weight:600;color:#1E2A36;white-space:nowrap;">${escapeHtml(m.fromName)}<br/><span style="font-weight:400;color:#94A3B8;font-size:11px;">${m.fromRole}</span></td>
          <td style="padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#2C3E50;">${escapeHtml(m.body) || "<i style='color:#94A3B8'>—</i>"}${m.attachmentUrl ? `<br/><span style='color:#64748B;font-size:11px;'>📎 ${escapeHtml(m.attachmentName ?? "attachment")}</span>` : ""}${m.flagged ? ` <span style='color:#DC2626;font-size:11px;'>⚑ ${escapeHtml(m.flagReason ?? "flagged")}</span>` : ""}</td>
        </tr>`
      )
      .join("");
    const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8">
      <title>Conversation — ${escapeHtml(names)}</title>
      <style>body{font-family:Inter,Arial,sans-serif;margin:32px;color:#1E2A36;}
        h1{font-size:18px;margin:0 0 4px;} .meta{color:#64748B;font-size:12px;margin-bottom:16px;}
        table{width:100%;border-collapse:collapse;} th{text-align:${isAr ? "right" : "left"};background:#1E2A36;color:#fff;padding:8px 10px;font-size:12px;}</style>
      </head><body>
      <h1>HAJR A° — ${escapeHtml(names)}</h1>
      <div class="meta">${viewMessages.length} messages · exported ${fmtRiyadh(new Date(), "yyyy-MM-dd HH:mm")}</div>
      <table><thead><tr><th>Time</th><th>Sender</th><th>Message</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }

  return (
    <>
      {/* filters */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-hajr-light" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchParticipant")}
              className="ps-9"
            />
          </div>
          <Select
            value={roleFilter || "_all_"}
            onValueChange={(v) => setRoleFilter(v === "_all_" ? "" : v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("filterRole")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">{t("filterAll")}</SelectItem>
              <SelectItem value="TEACHER">{t("role_TEACHER")}</SelectItem>
              <SelectItem value="STUDENT">{t("role_STUDENT")}</SelectItem>
              <SelectItem value="PARENT">{t("role_PARENT")}</SelectItem>
              <SelectItem value="ADMIN">{t("role_ADMIN")}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-36"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-36"
          />
          <Button variant="outline" size="sm" onClick={load}>
            {t("applyFilters")}
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-hajr-navy" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-14 text-center">
            <MessagesSquare className="h-10 w-10 text-hajr-light" />
            <p className="text-sm text-hajr-muted">{t("noConversations")}</p>
          </div>
        ) : (
          <div className="divide-y divide-hajr-border">
            {rows.map((r) => (
              <button
                key={r.threadId}
                onClick={() => openConversation(r)}
                className="flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-hajr-hover"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-hajr-surface">
                  <MessagesSquare className="h-5 w-5 text-hajr-navy" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {r.participants.map((p) => (
                      <Badge key={p.id} variant={roleVariant(p.role)} className="text-[10px]">
                        {p.name}
                      </Badge>
                    ))}
                    {r.flaggedCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-hajr-error">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span className="num">{r.flaggedCount}</span>
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-hajr-muted">{r.lastMessage}</p>
                </div>
                <div className="shrink-0 text-end">
                  <div className="text-[11px] text-hajr-light num">
                    {fmtRiyadh(r.lastAt, "yyyy-MM-dd HH:mm")}
                  </div>
                  <div className="num text-[11px] text-hajr-muted">
                    {r.messageCount} {t("messagesCount")}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* read-only conversation viewer */}
      <Dialog open={!!openThread} onOpenChange={(o) => !o && setOpenThread(null)}>
        <DialogContent className="max-w-2xl">
          {openThread && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {openThread.participants.map((p) => (
                    <Badge key={p.id} variant={roleVariant(p.role)}>
                      {p.name}
                    </Badge>
                  ))}
                </DialogTitle>
              </DialogHeader>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs text-hajr-muted">
                  <Eye className="h-3.5 w-3.5" />
                  {t("readOnlyNote")}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="ms-auto"
                  onClick={exportPdf}
                  disabled={viewLoading || viewMessages.length === 0}
                >
                  <FileDown className="me-1.5 h-4 w-4" />
                  {t("exportPdf")}
                </Button>
              </div>

              <div className="max-h-[55vh] space-y-2 overflow-y-auto rounded-lg bg-hajr-surface p-3">
                {viewLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-5 w-5 animate-spin text-hajr-navy" />
                  </div>
                ) : (
                  viewMessages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "rounded-xl border bg-white p-3",
                        m.flagged ? "border-hajr-error" : "border-hajr-border"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-hajr-navy">{m.fromName}</span>
                        <Badge variant={roleVariant(m.fromRole)} className="text-[10px]">
                          {m.fromRole}
                        </Badge>
                        <span className="num ms-auto text-[11px] text-hajr-light">
                          {fmtRiyadh(m.createdAt, "yyyy-MM-dd HH:mm")}
                        </span>
                      </div>
                      {m.body && (
                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-hajr-body">{m.body}</p>
                      )}
                      {m.attachmentUrl && (
                        <a
                          href={m.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-block text-xs text-hajr-info underline"
                        >
                          📎 {m.attachmentName ?? "attachment"}
                        </a>
                      )}
                      {m.flagged && m.flagReason && (
                        <p className="mt-1.5 rounded bg-red-50 px-2 py-1 text-[11px] text-red-700">
                          ⚑ {m.flagReason}
                        </p>
                      )}
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={flagging === m.id}
                          onClick={() => toggleFlag(m)}
                          className={cn(
                            "h-7 text-xs",
                            m.flagged ? "text-hajr-error" : "text-hajr-muted"
                          )}
                        >
                          {flagging === m.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Flag className={cn("me-1 h-3.5 w-3.5", m.flagged && "fill-current")} />
                          )}
                          {m.flagged ? t("unflag") : t("flag")}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
