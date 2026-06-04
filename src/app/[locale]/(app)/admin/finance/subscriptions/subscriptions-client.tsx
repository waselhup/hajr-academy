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
import { Pause, Play, XCircle } from "lucide-react";

interface SubRow {
  id: string;
  studentName: string;
  packageType: string;
  status: string;
  totalWithVat: number;
  currentPeriodStart: string;
  nextBillingDate: string | null;
  autoRenew: boolean;
}

const STATUSES = ["ACTIVE", "PAUSED", "CANCELLED", "EXPIRED", "PAST_DUE", "TRIAL"];

function statusVariant(s: string): "success" | "warning" | "danger" | "outline" {
  if (s === "ACTIVE") return "success";
  if (s === "PAUSED" || s === "TRIAL") return "warning";
  if (s === "PAST_DUE" || s === "EXPIRED") return "danger";
  return "outline";
}

export function AdminSubscriptionsClient({
  subscriptions,
}: {
  subscriptions: SubRow[];
}) {
  const t = useTranslations("Finance");
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";

  const [statusFilter, setStatusFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = subscriptions.filter(
    (s) => !statusFilter || s.status === statusFilter
  );

  const money = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA-u-nu-latn" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  const date = (s: string | null) =>
    s ? new Date(s).toISOString().slice(0, 10) : "—";

  async function action(
    id: string,
    kind: "pause" | "resume" | "cancel"
  ) {
    setBusy(id);
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
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
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
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
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("student")}</TableHead>
                <TableHead>{t("package")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("amount")}</TableHead>
                <TableHead>{t("startDate")}</TableHead>
                <TableHead>{t("nextBilling")}</TableHead>
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
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.studentName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.packageType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(s.status)}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="num">
                      {money(s.totalWithVat)} {isAr ? "ر.س" : "SAR"}
                    </TableCell>
                    <TableCell className="num">
                      {date(s.currentPeriodStart)}
                    </TableCell>
                    <TableCell className="num">
                      {date(s.nextBillingDate)}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        {s.status === "ACTIVE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === s.id}
                            onClick={() => action(s.id, "pause")}
                            title={t("pause")}
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {s.status === "PAUSED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === s.id}
                            onClick={() => action(s.id, "resume")}
                            title={t("resume")}
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {s.status !== "CANCELLED" &&
                          s.status !== "EXPIRED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === s.id}
                              onClick={() => action(s.id, "cancel")}
                              title={t("cancel")}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
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
