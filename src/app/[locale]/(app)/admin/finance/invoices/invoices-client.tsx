"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, CheckCircle2, Bell, Ban } from "lucide-react";

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  studentName: string;
  status: string;
  packageType: string | null;
  totalAmount: number;
  issuedAt: string;
  dueDate: string;
}

const STATUSES = ["DRAFT", "PENDING", "PAID", "OVERDUE", "CANCELLED", "REFUNDED"];

function statusVariant(s: string): "success" | "warning" | "danger" | "outline" {
  if (s === "PAID") return "success";
  if (s === "PENDING" || s === "DRAFT") return "warning";
  if (s === "OVERDUE") return "danger";
  return "outline";
}

export function AdminInvoicesClient({ invoices }: { invoices: InvoiceRow[] }) {
  const t = useTranslations("Finance");
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";

  const [statusFilter, setStatusFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = invoices.filter(
    (inv) => !statusFilter || inv.status === statusFilter
  );
  const overdueIds = invoices
    .filter((i) => i.status === "OVERDUE")
    .map((i) => i.id);

  const money = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  const date = (s: string) => new Date(s).toISOString().slice(0, 10);

  async function action(
    id: string,
    kind: "markPaid" | "cancel" | "remind"
  ) {
    setBusy(id);
    try {
      if (kind === "remind") {
        const res = await fetch(`/api/invoices/${id}/send-reminder`, {
          method: "POST",
        });
        const json = await res.json();
        if (json.ok) toast.success(isAr ? "تم إرسال التذكير" : "Reminder sent");
        else toast.error(json.error ?? "Failed");
      } else {
        const res = await fetch(`/api/invoices/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: kind }),
        });
        const json = await res.json();
        if (json.ok) {
          toast.success(isAr ? "تم التحديث" : "Updated");
          router.refresh();
        } else {
          toast.error(json.error ?? "Failed");
        }
      }
    } finally {
      setBusy(null);
    }
  }

  async function remindAllOverdue() {
    setBusy("bulk");
    let sent = 0;
    for (const id of overdueIds) {
      const res = await fetch(`/api/invoices/${id}/send-reminder`, {
        method: "POST",
      });
      if ((await res.json()).ok) sent++;
    }
    toast.success(
      isAr ? `تم إرسال ${sent} تذكير` : `${sent} reminders sent`
    );
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      {/* Filters + bulk actions */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border p-2 text-sm"
        >
          <option value="">{t("filterStatus")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="ms-auto flex gap-2">
          {overdueIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={remindAllOverdue}
              disabled={busy === "bulk"}
            >
              <Bell className="me-1.5 h-3.5 w-3.5" />
              {t("remindAllOverdue")}
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <a href="/api/admin/finance/export">
              <Download className="me-1.5 h-3.5 w-3.5" />
              {t("exportCsv")}
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("invoices")}</TableHead>
                <TableHead>{t("student")}</TableHead>
                <TableHead>{t("amount")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("issued")}</TableHead>
                <TableHead>{t("due")}</TableHead>
                <TableHead className="text-end">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="p-6 text-center text-muted-foreground"
                  >
                    {t("noData")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="num">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.studentName}</TableCell>
                    <TableCell className="num">
                      {money(inv.totalAmount)} {isAr ? "ر.س" : "SAR"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(inv.status)}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="num">{date(inv.issuedAt)}</TableCell>
                    <TableCell className="num">{date(inv.dueDate)}</TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        {inv.status !== "PAID" &&
                          inv.status !== "CANCELLED" &&
                          inv.status !== "REFUNDED" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy === inv.id}
                                onClick={() => action(inv.id, "markPaid")}
                                title={t("markPaid")}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy === inv.id}
                                onClick={() => action(inv.id, "remind")}
                                title={t("sendReminder")}
                              >
                                <Bell className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy === inv.id}
                                onClick={() => action(inv.id, "cancel")}
                                title={t("cancel")}
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={`/api/invoices/${inv.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={t("download")}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
