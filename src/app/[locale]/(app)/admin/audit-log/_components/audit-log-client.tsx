"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Download, ChevronDown } from "lucide-react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DateField } from "@/components/ui/western-fields";
import { fmtRiyadh, fmtHijri } from "@/lib/format";

type Row = {
  id: string; createdAt: string;
  action: string; entity: string | null; entityId: string | null;
  metadata: any; ipAddress: string | null;
  user: { name: string; email: string; role: string } | null;
};

function actionVariant(a: string): "success" | "info" | "danger" | "warning" {
  if (a.includes("CREATED")) return "success";
  if (a.includes("UPDATED") || a.includes("TOGGLED")) return "info";
  if (a.includes("DELETED") || a.includes("CANCELLED")) return "danger";
  return "warning";
}

export function AuditLogClient({
  rows, total, page, pageSize, actions,
}: {
  rows: Row[]; total: number; page: number; pageSize: number;
  actions: { value: string; count: number }[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function update(key: string, value: string | null) {
    const p = new URLSearchParams(sp.toString());
    if (value === null || value === "" || value === "_all_") p.delete(key);
    else p.set(key, value);
    if (key !== "page") p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  }

  let timer: any;
  function debouncedQ(v: string) {
    clearTimeout(timer);
    timer = setTimeout(() => update("q", v || null), 300);
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  function exportCsv() {
    const data = rows.map((r) => ({
      timestamp: r.createdAt,
      hijri: fmtHijri(r.createdAt),
      user: r.user?.name ?? "",
      email: r.user?.email ?? "",
      role: r.user?.role ?? "",
      action: r.action,
      entity: r.entity ?? "",
      entityId: r.entityId ?? "",
      ipAddress: r.ipAddress ?? "",
      metadata: JSON.stringify(r.metadata ?? {}),
    }));
    const blob = new Blob([Papa.unparse(data)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("AuditLog.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Common.showing")} <span className="num">{rows.length}</span> {t("Common.of")} <span className="num">{total}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="me-2 h-4 w-4" />{t("AuditLog.exportCsv")}</Button>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input defaultValue={sp.get("q") ?? ""} placeholder={t("Common.search")} className="ps-9" onChange={(e) => debouncedQ(e.target.value)} />
          </div>
          <Select value={sp.get("action") ?? "_all_"} onValueChange={(v) => update("action", v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder={t("AuditLog.filterAction")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">{t("Common.all")}</SelectItem>
              <SelectItem value="CREATE">CREATE</SelectItem>
              <SelectItem value="UPDATE">UPDATE</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              {actions.map((a) => <SelectItem key={a.value} value={a.value}>{a.value}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sp.get("role") ?? "_all_"} onValueChange={(v) => update("role", v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">{t("Common.all")}</SelectItem>
              <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
              <SelectItem value="TEACHER">TEACHER</SelectItem>
              <SelectItem value="STUDENT">STUDENT</SelectItem>
              <SelectItem value="PARENT">PARENT</SelectItem>
            </SelectContent>
          </Select>
          <DateField className="w-36" value={sp.get("from") ?? ""} onChange={(e) => update("from", e.target.value || null)} />
          <DateField className="w-36" value={sp.get("to") ?? ""} onChange={(e) => update("to", e.target.value || null)} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>{t("AuditLog.user")}</TableHead>
              <TableHead>{t("AuditLog.action")}</TableHead>
              <TableHead>{t("AuditLog.entity")}</TableHead>
              <TableHead>{t("AuditLog.ip")}</TableHead>
              <TableHead>{t("AuditLog.details")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground p-12">{t("Common.noResults")}</TableCell></TableRow>
            ) : rows.map((r) => (
              <>
                <TableRow key={r.id}>
                  <TableCell className="text-xs num">
                    <div>{fmtRiyadh(r.createdAt, "yyyy-MM-dd HH:mm:ss")}</div>
                    <div className="text-muted-foreground" dir="rtl">{fmtHijri(r.createdAt)}</div>
                  </TableCell>
                  <TableCell>
                    {r.user ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7"><AvatarFallback>{r.user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                        <div>
                          <div className="text-sm font-medium">{r.user.name}</div>
                          <div className="text-xs text-muted-foreground">{r.user.role}</div>
                        </div>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">SYSTEM</span>}
                  </TableCell>
                  <TableCell><Badge variant={actionVariant(r.action)}>{r.action}</Badge></TableCell>
                  <TableCell className="text-xs">{r.entity}{r.entityId ? <div className="text-muted-foreground">{r.entityId.slice(0, 8)}…</div> : null}</TableCell>
                  <TableCell className="text-xs num">{r.ipAddress ?? "—"}</TableCell>
                  <TableCell>
                    {r.metadata && Object.keys(r.metadata).length > 0 ? (
                      <Button variant="ghost" size="sm" onClick={() => setExpanded((e) => ({ ...e, [r.id]: !e[r.id] }))}>
                        <ChevronDown className={`h-3 w-3 transition ${expanded[r.id] ? "rotate-180" : ""}`} />
                      </Button>
                    ) : "—"}
                  </TableCell>
                </TableRow>
                {expanded[r.id] && r.metadata && (
                  <TableRow key={r.id + "_x"}>
                    <TableCell colSpan={6}>
                      <pre className="overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(r.metadata, null, 2)}</pre>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{t("Common.page")} <span className="num">{page}</span> {t("Common.of")} <span className="num">{pages}</span></span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update("page", String(page - 1))}>{t("Common.previous")}</Button>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => update("page", String(page + 1))}>{t("Common.next")}</Button>
        </div>
      </div>
    </div>
  );
}
