"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2, Search, Mail, Phone, Inbox, CheckCircle2, Archive, Reply,
} from "lucide-react";
import { fmtRiyadh } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Submission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: "NEW" | "REPLIED" | "CLOSED";
  source: string;
  repliedBy: string | null;
  repliedAt: string | null;
  createdAt: string;
}

const STATUSES = ["NEW", "REPLIED", "CLOSED"] as const;

function statusVariant(s: string): "warning" | "success" | "draft" {
  if (s === "NEW") return "warning";
  if (s === "REPLIED") return "success";
  return "draft";
}

export function ContactsClient() {
  const t = useTranslations("AdminComms");
  const tc = useTranslations("Contact");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [rows, setRows] = useState<Submission[]>([]);
  const [counts, setCounts] = useState({ NEW: 0, REPLIED: 0, CLOSED: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Submission | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/communications/contacts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.submissions);
        setCounts(data.counts);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, q]);

  useEffect(() => {
    const tid = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(tid);
  }, [load, q]);

  async function setStatus(id: string, status: Submission["status"]) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/communications/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        );
        setActive((a) => (a && a.id === id ? { ...a, status } : a));
        load();
      }
    } finally {
      setUpdating(null);
    }
  }

  function replyByEmail(s: Submission) {
    const subject = encodeURIComponent(`Re: ${tc(`subject${s.subject}` as any)}`);
    window.open(`mailto:${s.email}?subject=${subject}`, "_blank");
    if (s.status === "NEW") setStatus(s.id, "REPLIED");
  }

  return (
    <>
      {/* status tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          label={t("filterAll")}
          active={statusFilter === ""}
          onClick={() => setStatusFilter("")}
        />
        {STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={`${t(`status_${s}` as any)} (${counts[s]})`}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          />
        ))}
        <div className="relative ms-auto w-64">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-hajr-light" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchContacts")}
            className="ps-9"
          />
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-hajr-navy" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-14 text-center">
            <Inbox className="h-10 w-10 text-hajr-light" />
            <p className="text-sm text-hajr-muted">{t("noContacts")}</p>
          </div>
        ) : (
          <div className="divide-y divide-hajr-border">
            {rows.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s)}
                className="flex w-full items-start gap-3 p-4 text-start transition-colors hover:bg-hajr-hover"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hajr-surface text-sm font-semibold text-hajr-navy">
                  {s.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-hajr-navy">{s.name}</span>
                    <Badge variant={statusVariant(s.status)} className="text-[10px]">
                      {t(`status_${s.status}` as any)}
                    </Badge>
                    <Badge variant="info" className="text-[10px]">
                      {tc(`subject${s.subject}` as any)}
                    </Badge>
                    {s.source === "public_assistant" && (
                      <Badge variant="default" className="text-[10px]">
                        {t("viaAssistant")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-hajr-muted">{s.message}</p>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-hajr-light">
                    <span>{s.email}</span>
                    <span className="num">{fmtRiyadh(s.createdAt, "yyyy-MM-dd HH:mm")}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* detail dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(active.status)}>
                    {t(`status_${active.status}` as any)}
                  </Badge>
                  <Badge variant="info">{tc(`subject${active.subject}` as any)}</Badge>
                </div>
                <div className="space-y-1.5 rounded-lg border border-hajr-border bg-hajr-surface p-3 text-sm">
                  <div className="flex items-center gap-2 text-hajr-body">
                    <Mail className="h-4 w-4 text-hajr-muted" />
                    <a href={`mailto:${active.email}`} className="text-hajr-info hover:underline">
                      {active.email}
                    </a>
                  </div>
                  {active.phone && (
                    <div className="flex items-center gap-2 text-hajr-body" dir="ltr">
                      <Phone className="h-4 w-4 text-hajr-muted" />
                      <span>{active.phone}</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-hajr-light">
                    {t("messageLabel")}
                  </div>
                  <p className="whitespace-pre-wrap rounded-lg border border-hajr-border bg-white p-3 text-sm text-hajr-body">
                    {active.message}
                  </p>
                </div>
                <div className="text-[11px] text-hajr-light">
                  {t("receivedAt")}{" "}
                  <span className="num">{fmtRiyadh(active.createdAt, "yyyy-MM-dd HH:mm")}</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="cta" size="sm" onClick={() => replyByEmail(active)}>
                    <Reply className="me-1.5 h-4 w-4 rtl-flip" />
                    {t("replyByEmail")}
                  </Button>
                  {active.status !== "REPLIED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updating === active.id}
                      onClick={() => setStatus(active.id, "REPLIED")}
                    >
                      <CheckCircle2 className="me-1.5 h-4 w-4" />
                      {t("markReplied")}
                    </Button>
                  )}
                  {active.status !== "CLOSED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updating === active.id}
                      onClick={() => setStatus(active.id, "CLOSED")}
                    >
                      <Archive className="me-1.5 h-4 w-4" />
                      {t("markClosed")}
                    </Button>
                  )}
                  {active.status !== "NEW" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={updating === active.id}
                      onClick={() => setStatus(active.id, "NEW")}
                    >
                      {t("reopen")}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-hajr-deep-navy bg-hajr-deep-navy text-white"
          : "border-hajr-border bg-white text-hajr-body hover:bg-hajr-hover"
      )}
    >
      {label}
    </button>
  );
}
