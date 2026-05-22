"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Undo2 } from "lucide-react";

interface PaymentRow {
  paymentId: string;
  invoiceNumber: string;
  studentName: string;
  amount: number;
  refundedAmount: number;
  status: string;
  reason: string | null;
  refundedAt: string | null;
}

export function AdminRefundsClient({
  payments,
}: {
  payments: PaymentRow[];
}) {
  const t = useTranslations("Finance");
  const locale = useLocale();
  const router = useRouter();
  const isAr = locale === "ar";

  const [target, setTarget] = useState<PaymentRow | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const money = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  const sar = isAr ? "ر.س" : "SAR";
  const date = (s: string | null) =>
    s ? new Date(s).toISOString().slice(0, 10) : "—";

  const refundable = (p: PaymentRow) =>
    +(p.amount - p.refundedAmount).toFixed(2);

  function openRefund(p: PaymentRow) {
    setTarget(p);
    setAmount(refundable(p).toFixed(2));
    setReason("");
  }

  async function submitRefund() {
    if (!target) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error(isAr ? "مبلغ غير صالح" : "Invalid amount");
      return;
    }
    if (amt > refundable(target)) {
      toast.error(
        isAr
          ? `الحد الأقصى ${refundable(target).toFixed(2)} ر.س`
          : `Max ${refundable(target).toFixed(2)} SAR`
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: target.paymentId,
          amount: amt,
          reason: reason || undefined,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(
          isAr
            ? `تم استرداد ${money(json.refundedAmount)} ر.س`
            : `Refunded ${money(json.refundedAmount)} SAR`
        );
        setTarget(null);
        router.refresh();
      } else {
        toast.error(json.error ?? "Refund failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("originalInvoice")}</TableHead>
                <TableHead>{t("student")}</TableHead>
                <TableHead>{t("amount")}</TableHead>
                <TableHead>{t("refundAmount")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("reason")}</TableHead>
                <TableHead className="text-end">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="p-6 text-center text-muted-foreground"
                  >
                    {t("noData")}
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.paymentId}>
                    <TableCell className="num">{p.invoiceNumber}</TableCell>
                    <TableCell>{p.studentName}</TableCell>
                    <TableCell className="num">
                      {money(p.amount)} {sar}
                    </TableCell>
                    <TableCell className="num">
                      {p.refundedAmount > 0
                        ? `${money(p.refundedAmount)} ${sar}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "REFUNDED"
                            ? "outline"
                            : p.status === "PARTIALLY_REFUNDED"
                              ? "warning"
                              : "success"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                      {p.reason ?? "—"}
                    </TableCell>
                    <TableCell className="text-end">
                      {refundable(p) > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRefund(p)}
                        >
                          <Undo2 className="me-1.5 h-3.5 w-3.5" />
                          {t("processRefund")}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {date(p.refundedAt)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Refund dialog */}
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("processRefund")}</DialogTitle>
          </DialogHeader>
          {target && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("originalInvoice")}
                  </span>
                  <span className="num">{target.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("amount")}</span>
                  <span className="num">
                    {money(target.amount)} {sar}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {isAr ? "القابل للاسترداد" : "Refundable"}
                  </span>
                  <span className="num font-semibold">
                    {money(refundable(target))} {sar}
                  </span>
                </div>
              </div>
              <div>
                <Label>{t("refundAmount")} (SAR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("reason")}</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTarget(null)}
              disabled={busy}
            >
              {t("cancel")}
            </Button>
            <Button onClick={submitRefund} disabled={busy}>
              {busy ? t("saving") : t("processRefund")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
