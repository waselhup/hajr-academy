"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Receipt, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  previewBulkInvoiceAction, bulkGenerateInvoicesAction, unenrollStudentAction,
} from "../../../_actions/classes";
import { fmtSAR } from "@/lib/format";

export function ClassDetailActions({
  classId, unenrollId, variant,
}: {
  classId: string; unenrollId?: string; variant?: "row";
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showInvoice, setShowInvoice] = useState(false);
  const [preview, setPreview] = useState<{ count: number; totalSar: number; pricePerMonth: number } | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [confirmUnenroll, setConfirmUnenroll] = useState(false);

  if (variant === "row" && unenrollId) {
    return (
      <>
        <Button variant="ghost" size="icon" onClick={() => setConfirmUnenroll(true)}>
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
        <AlertDialog open={confirmUnenroll} onOpenChange={setConfirmUnenroll}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Common.confirmDelete")}</AlertDialogTitle>
              <AlertDialogDescription>{t("Common.confirmDeleteMsg")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("Common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                const res = await unenrollStudentAction(unenrollId);
                if (res.ok) toast.success(t("Common.success"));
                else toast.error(res.error);
                setConfirmUnenroll(false);
                router.refresh();
              }}>{t("Common.delete")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  async function loadPreview() {
    const res = await previewBulkInvoiceAction({ classId, month, year });
    if (!res.ok) { toast.error(res.error); return; }
    setPreview(res.data);
  }

  return (
    <>
      <Button variant="cta" onClick={() => { setShowInvoice(true); loadPreview(); }}>
        <Receipt className="me-2 h-4 w-4" />{t("Classes.bulkInvoice")}
      </Button>
      <Dialog open={showInvoice} onOpenChange={(o) => { if (!o) { setShowInvoice(false); setPreview(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Classes.bulkInvoice")}</DialogTitle>
            <DialogDescription>{t("Classes.bulkInvoicePreview")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Month</Label>
              <Input type="number" min={1} max={12} value={month} onChange={(e) => { setMonth(Number(e.target.value)); setPreview(null); }} />
            </div>
            <div>
              <Label>Year</Label>
              <Input type="number" min={2024} max={2099} value={year} onChange={(e) => { setYear(Number(e.target.value)); setPreview(null); }} />
            </div>
            <Button className="col-span-2" variant="outline" onClick={loadPreview}>{t("Classes.bulkInvoicePreview")}</Button>
            {preview && (
              <div className="col-span-2 rounded-md border bg-brand-ivory/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("Common.students")}</span>
                  <span className="font-medium num">{preview.count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("Classes.pricePerMonth")}</span>
                  <span className="font-medium num">{fmtSAR(preview.pricePerMonth, locale as "ar" | "en")}</span>
                </div>
                <div className="mt-1 border-t pt-1 flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold num">{fmtSAR(preview.totalSar, locale as "ar" | "en")}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoice(false)}>{t("Common.cancel")}</Button>
            <Button
              disabled={!preview || isPending}
              onClick={() => {
                if (!preview) return;
                startTransition(async () => {
                  const res = await bulkGenerateInvoicesAction({ classId, month, year });
                  if (!res.ok) { toast.error(res.error); return; }
                  toast.success(t("Classes.bulkInvoiceDone", { n: res.data.count }));
                  setShowInvoice(false);
                  setPreview(null);
                  router.refresh();
                });
              }}
            >
              {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {preview ? t("Classes.bulkInvoiceConfirm", { n: preview.count, sum: fmtSAR(preview.totalSar, locale as "ar" | "en") }) : t("Common.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
