"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateField } from "@/components/ui/western-fields";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  recordPartnerPayoutAction,
  deletePartnerPayoutAction,
} from "../../_actions/partner-payouts";

export type PayoutMethod = "BANK_TRANSFER" | "CASH" | "OTHER";

export interface PayoutRow {
  id: string;
  amountSar: number;
  method: PayoutMethod;
  reference: string | null;
  note: string | null;
  paidAt: string;
}

const METHODS: PayoutMethod[] = ["BANK_TRANSFER", "CASH", "OTHER"];
const METHOD_LABEL: Record<PayoutMethod, { ar: string; en: string }> = {
  BANK_TRANSFER: { ar: "تحويل بنكي", en: "Bank transfer" },
  CASH: { ar: "نقداً", en: "Cash" },
  OTHER: { ar: "أخرى", en: "Other" },
};

/** dd/mm/yyyy, Western digits — the platform-wide rule. */
function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Riyadh",
  }).format(new Date(iso));
}

function todayInputValue(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Riyadh",
  }).format(new Date());
  return parts; // en-CA gives yyyy-mm-dd
}

export function PartnerPayoutsClient({
  partnerSchoolId,
  payouts,
  owedSar,
  paidSar,
}: {
  partnerSchoolId: string;
  payouts: PayoutRow[];
  owedSar: number;
  paidSar: number;
}) {
  const isAr = useLocale() === "ar";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const remaining = +(owedSar - paidSar).toFixed(2);

  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<PayoutMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState(todayInputValue());

  const money = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA-u-nu-latn" : "en-US", {
      minimumFractionDigits: 2,
    }).format(n);
  const sar = isAr ? "ر.س" : "SAR";

  function openDialog() {
    // Pre-fill with what is actually outstanding — the common case is
    // settling the balance in full.
    setAmount(remaining > 0 ? remaining.toFixed(2) : "");
    setMethod("BANK_TRANSFER");
    setReference("");
    setNote("");
    setPaidAt(todayInputValue());
    setOpen(true);
  }

  function submit() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(isAr ? "أدخل مبلغاً أكبر من صفر." : "Enter an amount greater than zero.");
      return;
    }
    startTransition(async () => {
      const res = await recordPartnerPayoutAction({
        partnerSchoolId,
        amountSar: value,
        method,
        reference: reference || null,
        note: note || null,
        paidAt: paidAt || null,
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(isAr ? "سُجّل الصرف" : "Payment recorded");
      setOpen(false);
      router.refresh();
    });
  }

  function remove(id: string, amountSar: number) {
    const q = isAr
      ? `حذف دفعة ${money(amountSar)} ${sar} من السجل؟`
      : `Remove the ${money(amountSar)} ${sar} payment from the ledger?`;
    if (!window.confirm(q)) return;
    startTransition(async () => {
      const res = await deletePartnerPayoutAction(id);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(isAr ? "حُذفت الدفعة" : "Payment removed");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5" />
              {isAr ? "صرف العمولات" : "Commission payouts"}
            </CardTitle>
            <CardDescription>
              {isAr
                ? "«المستحق» يُحسب من المبيعات ولا يُعدَّل. «المصروف» تُسجّله أنت هنا عند كل دفعة."
                : "“Earned” is derived from sales and cannot be edited. “Paid” is what you record here each time you settle."}
            </CardDescription>
          </div>
          <Button variant="cta" size="sm" onClick={openDialog}>
            <Plus className="me-2 h-4 w-4" />
            {isAr ? "تسجيل صرف" : "Record a payment"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Figure label={isAr ? "المستحق" : "Earned"} value={`${money(owedSar)} ${sar}`} />
          <Figure label={isAr ? "المصروف" : "Paid"} value={`${money(paidSar)} ${sar}`} tone="success" />
          <Figure
            label={remaining < 0 ? (isAr ? "مدفوع بالزائد" : "Overpaid") : (isAr ? "المتبقي" : "Outstanding")}
            value={`${money(Math.abs(remaining))} ${sar}`}
            tone={remaining > 0 ? "accent" : remaining < 0 ? "warning" : "success"}
          />
        </div>

        <div className="overflow-x-auto rounded-card border border-hajr-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? "التاريخ" : "Date"}</TableHead>
                <TableHead>{isAr ? "المبلغ" : "Amount"}</TableHead>
                <TableHead>{isAr ? "الطريقة" : "Method"}</TableHead>
                <TableHead>{isAr ? "المرجع" : "Reference"}</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-6 text-center text-muted-foreground">
                    {isAr ? "لم تُصرف أي عمولة بعد." : "No commission has been paid out yet."}
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="num">{fmtDate(p.paidAt)}</TableCell>
                    <TableCell className="num font-semibold">{money(p.amountSar)} {sar}</TableCell>
                    <TableCell>{METHOD_LABEL[p.method][isAr ? "ar" : "en"]}</TableCell>
                    <TableCell className="text-xs">
                      <span className="num" dir="ltr">{p.reference ?? "—"}</span>
                      {p.note && <div className="text-muted-foreground">{p.note}</div>}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-hajr-rose hover:bg-hajr-rose/10"
                        disabled={isPending}
                        onClick={() => remove(p.id, p.amountSar)}
                        aria-label={isAr ? "حذف" : "Remove"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {open && (
        <Dialog open onOpenChange={(o) => !o && setOpen(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{isAr ? "تسجيل صرف عمولة" : "Record a commission payment"}</DialogTitle>
              <DialogDescription>
                {isAr
                  ? `المتبقي حالياً ${money(Math.max(0, remaining))} ${sar}. يمكنك صرف مبلغ جزئي.`
                  : `Outstanding right now: ${money(Math.max(0, remaining))} ${sar}. A partial payment is fine.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{isAr ? "المبلغ (ر.س)" : "Amount (SAR)"}</Label>
                <Input
                  type="number" min="0.01" step="0.01" inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{isAr ? "الطريقة" : "Method"}</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as PayoutMethod)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {METHODS.map((m) => (
                        <SelectItem key={m} value={m}>{METHOD_LABEL[m][isAr ? "ar" : "en"]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{isAr ? "تاريخ الصرف" : "Payment date"}</Label>
                  <DateField value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{isAr ? "رقم التحويل / المرجع" : "Transfer number / reference"}</Label>
                <Input dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>{isAr ? "ملاحظة" : "Note"}</Label>
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={submit} disabled={isPending}>
                {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {isAr ? "تم الصرف" : "Mark as paid"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

function Figure({
  label, value, tone,
}: { label: string; value: string; tone?: "success" | "accent" | "warning" }) {
  const color =
    tone === "success" ? "text-hajr-success"
    : tone === "accent" ? "text-hajr-rose"
    : tone === "warning" ? "text-hajr-warning"
    : "";
  return (
    <div className="rounded-card border border-hajr-border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`num text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
