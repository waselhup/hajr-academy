"use client";
import { useState, useMemo, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type EarningRow = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  className: string;
  cohortCode: string | null;
  date: string;
  hoursWorked: number;
  hourlyRate: number;
  amount: number;
  status: "PENDING" | "APPROVED" | "PAID";
};

export function AdminPaymentsClient({
  rows,
  teachers,
  currentStatus,
}: {
  rows: EarningRow[];
  teachers: { id: string; name: string; hourlyRate: number }[];
  currentStatus: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rateDialog, setRateDialog] = useState<{ id: string; name: string; current: number } | null>(null);
  const [newRate, setNewRate] = useState<string>("");

  const grouped = useMemo(() => {
    const m = new Map<string, EarningRow[]>();
    for (const r of rows) {
      const arr = m.get(r.teacherId) ?? [];
      arr.push(r);
      m.set(r.teacherId, arr);
    }
    return Array.from(m.entries()).map(([teacherId, list]) => ({
      teacherId,
      teacherName: list[0].teacherName,
      teacherEmail: list[0].teacherEmail,
      list,
      total: list.reduce((s, r) => s + r.amount, 0),
    }));
  }, [rows]);

  const toggleAll = (groupRows: EarningRow[], check: boolean) => {
    const next = new Set(selected);
    for (const r of groupRows) {
      if (r.status !== "PENDING") continue;
      if (check) next.add(r.id);
      else next.delete(r.id);
    }
    setSelected(next);
  };

  const setStatusFilter = (s: string) => {
    const p = new URLSearchParams(sp.toString());
    p.set("status", s);
    router.push(`${pathname}?${p.toString()}`);
  };

  const setTeacherFilter = (id: string) => {
    const p = new URLSearchParams(sp.toString());
    if (id) p.set("teacherId", id);
    else p.delete("teacherId");
    router.push(`${pathname}?${p.toString()}`);
  };

  const setFromTo = (key: "from" | "to", v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(key, v);
    else p.delete(key);
    router.push(`${pathname}?${p.toString()}`);
  };

  const act = async (id: string, action: "approve" | "pay" | "reject") => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/teacher-earnings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Action failed");
        return;
      }
      toast.success("Done");
      router.refresh();
    });
  };

  const bulkApprove = async () => {
    if (selected.size === 0) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/teacher-earnings/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Bulk approve failed");
        return;
      }
      toast.success(`Approved ${data.count}`);
      setSelected(new Set());
      router.refresh();
    });
  };

  const saveRate = async () => {
    if (!rateDialog) return;
    const rate = Number(newRate);
    if (!Number.isFinite(rate) || rate < 0) {
      toast.error("Invalid rate");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/admin/teachers/${rateDialog.id}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hourlyRate: rate }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Save failed");
        return;
      }
      toast.success(t("AdminPay.rateUpdated"));
      setRateDialog(null);
      setNewRate("");
      router.refresh();
    });
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <>
      {/* Filters */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <Tabs value={currentStatus} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="PENDING">{t("TeacherPay.status_PENDING")}</TabsTrigger>
              <TabsTrigger value="APPROVED">{t("TeacherPay.status_APPROVED")}</TabsTrigger>
              <TabsTrigger value="PAID">{t("TeacherPay.status_PAID")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{locale === "ar" ? "المعلّم" : "Teacher"}</Label>
              <select
                value={sp.get("teacherId") ?? ""}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="h-9 rounded-md border bg-white px-2 text-sm"
              >
                <option value="">{locale === "ar" ? "الكل" : "All"}</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{locale === "ar" ? "من" : "From"}</Label>
              <Input
                type="date"
                defaultValue={sp.get("from") ?? ""}
                onChange={(e) => setFromTo("from", e.target.value)}
                className="h-9 w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{locale === "ar" ? "إلى" : "To"}</Label>
              <Input
                type="date"
                defaultValue={sp.get("to") ?? ""}
                onChange={(e) => setFromTo("to", e.target.value)}
                className="h-9 w-40"
              />
            </div>
            {selected.size > 0 && (
              <Button variant="cta" size="sm" onClick={bulkApprove} disabled={isPending}>
                {t("AdminPay.bulkApprove")} ({selected.size})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Teacher manage hourly rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {locale === "ar" ? "أسعار المعلّمين بالساعة" : "Teacher Hourly Rates"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((tch) => (
              <div
                key={tch.id}
                className="flex items-center justify-between rounded-md border bg-muted/30 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{tch.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="num">{fmt(tch.hourlyRate)}</span>{" "}
                    {locale === "ar" ? "ر.س / ساعة" : "SAR/hr"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRateDialog({ id: tch.id, name: tch.name, current: tch.hourlyRate });
                    setNewRate(String(tch.hourlyRate));
                  }}
                >
                  {t("AdminPay.setRateTitle")}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Earnings grouped by teacher */}
      {grouped.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {locale === "ar" ? "لا توجد أرباح في هذه الحالة." : "No earnings in this status."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <Card key={g.teacherId}>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
                <div>
                  <CardTitle className="text-base">{g.teacherName}</CardTitle>
                  <p className="text-xs text-muted-foreground">{g.teacherEmail}</p>
                </div>
                <div className="text-end">
                  <p className="text-xs text-muted-foreground">
                    {locale === "ar" ? "الإجمالي" : "Total"}
                  </p>
                  <p className="num text-lg font-bold text-brand-navy">
                    {fmt(g.total)} {locale === "ar" ? "ر.س" : "SAR"}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {currentStatus === "PENDING" && (
                        <TableHead className="w-8">
                          <Checkbox
                            checked={g.list.every((r) => selected.has(r.id))}
                            onCheckedChange={(c) => toggleAll(g.list, !!c)}
                          />
                        </TableHead>
                      )}
                      <TableHead>{t("TeacherPay.earningDate")}</TableHead>
                      <TableHead>{t("TeacherPay.earningClass")}</TableHead>
                      <TableHead className="text-end">{t("TeacherPay.earningHours")}</TableHead>
                      <TableHead className="text-end">{t("TeacherPay.earningRate")}</TableHead>
                      <TableHead className="text-end">{t("TeacherPay.earningAmount")}</TableHead>
                      <TableHead className="text-end">
                        {locale === "ar" ? "إجراءات" : "Actions"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.list.map((r) => (
                      <TableRow key={r.id}>
                        {currentStatus === "PENDING" && (
                          <TableCell>
                            <Checkbox
                              checked={selected.has(r.id)}
                              onCheckedChange={(c) => {
                                const next = new Set(selected);
                                if (c) next.add(r.id);
                                else next.delete(r.id);
                                setSelected(next);
                              }}
                            />
                          </TableCell>
                        )}
                        <TableCell className="num text-xs">
                          {new Date(r.date).toLocaleDateString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US")}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.className}
                          {r.cohortCode && (
                            <span className="ms-1 text-muted-foreground num">· {r.cohortCode}</span>
                          )}
                        </TableCell>
                        <TableCell className="num text-end text-xs">
                          {r.hoursWorked.toFixed(2)}
                        </TableCell>
                        <TableCell className="num text-end text-xs">{fmt(r.hourlyRate)}</TableCell>
                        <TableCell className="num text-end font-semibold">{fmt(r.amount)}</TableCell>
                        <TableCell className="text-end">
                          <div className="flex flex-wrap justify-end gap-1">
                            {r.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="cta"
                                  onClick={() => act(r.id, "approve")}
                                  disabled={isPending}
                                >
                                  {t("AdminPay.approve")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => act(r.id, "reject")}
                                  disabled={isPending}
                                >
                                  {t("AdminPay.reject")}
                                </Button>
                              </>
                            )}
                            {r.status === "APPROVED" && (
                              <Button
                                size="sm"
                                variant="cta"
                                onClick={() => act(r.id, "pay")}
                                disabled={isPending}
                              >
                                {t("AdminPay.markPaid")}
                              </Button>
                            )}
                            {r.status === "PAID" && (
                              <Badge variant="success">{t("TeacherPay.status_PAID")}</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Set rate dialog */}
      <Dialog open={!!rateDialog} onOpenChange={(o) => !o && setRateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("AdminPay.setRateTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{rateDialog?.name}</p>
            <Label>{t("AdminPay.rateLabel")}</Label>
            <Input
              type="number"
              step="5"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRateDialog(null)}>
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={saveRate} disabled={isPending}>
              {t("AdminPay.saveRate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
