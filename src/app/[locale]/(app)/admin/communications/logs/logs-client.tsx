"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { fmtRiyadh } from "@/lib/format";

interface Msg {
  id: string;
  channel: string;
  status: string;
  subject: string | null;
  body: string;
  toName: string | null;
  fromName: string;
  triggerType: string;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

const CHANNELS = ["EMAIL", "SMS", "WHATSAPP", "IN_APP"];
const STATUSES = ["QUEUED", "SENT", "DELIVERED", "READ", "FAILED"];

function statusVariant(s: string): "success" | "warning" | "danger" | "info" {
  if (s === "FAILED") return "danger";
  if (s === "QUEUED") return "warning";
  if (s === "READ" || s === "DELIVERED") return "success";
  return "info";
}

export function LogsClient() {
  const t = useTranslations("Comms");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("status") ?? ""
      : ""
  );
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      if (channel) sp.set("channel", channel);
      if (status) sp.set("status", status);
      if (q) sp.set("q", q);
      const res = await fetch(`/api/admin/comms/messages?${sp}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, channel, status, q]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t("searchLogs")}
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          className="max-w-xs"
        />
        <select
          value={channel}
          onChange={(e) => {
            setPage(1);
            setChannel(e.target.value);
          }}
          className="rounded-md border p-2 text-sm"
        >
          <option value="">{t("allChannels")}</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="rounded-md border p-2 text-sm"
        >
          <option value="">{t("allStatuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-brand-rose" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("recipient")}</TableHead>
                  <TableHead>{t("channel")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("trigger")}</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="p-6 text-center text-muted-foreground"
                    >
                      {t("noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  messages.map((m) => (
                    <>
                      <TableRow
                        key={m.id}
                        className="cursor-pointer"
                        onClick={() =>
                          setExpanded(expanded === m.id ? null : m.id)
                        }
                      >
                        <TableCell>{m.toName ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{m.channel}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(m.status)}>
                            {m.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.triggerType}
                        </TableCell>
                        <TableCell className="num text-xs text-muted-foreground">
                          {fmtRiyadh(m.createdAt, "MM-dd HH:mm")}
                        </TableCell>
                      </TableRow>
                      {expanded === m.id && (
                        <TableRow key={m.id + "-detail"}>
                          <TableCell colSpan={5} className="bg-gray-50 text-sm">
                            {m.subject && (
                              <div className="font-medium">{m.subject}</div>
                            )}
                            <div className="text-muted-foreground">{m.body}</div>
                            {m.errorMessage && (
                              <div className="mt-1 text-red-600">
                                {t("error")}: {m.errorMessage}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t("previous")}
          </Button>
          <span className="text-sm num">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("next")}
          </Button>
        </div>
      )}
    </div>
  );
}
