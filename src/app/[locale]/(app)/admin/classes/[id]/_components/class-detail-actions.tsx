"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Receipt, Loader2, Trash2, UserPlus } from "lucide-react";
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
  enrollStudentInClassAction,
} from "../../../_actions/classes";
import { fmtSAR } from "@/lib/format";

export interface AvailableStudent {
  id: string;
  name: string;
  nameAr: string | null;
}

export function ClassDetailActions({
  classId, unenrollId, variant, availableStudents,
}: {
  classId: string;
  unenrollId?: string;
  variant?: "row";
  /** Students not yet in this class — enables the "Add Student" dialog. */
  availableStudents?: AvailableStudent[];
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
  const [showAdd, setShowAdd] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  const filteredAvailable = useMemo(() => {
    const list = availableStudents ?? [];
    const q = addSearch.trim().toLowerCase();
    if (!q) return list.slice(0, 50);
    return list
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.nameAr ?? "").toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [availableStudents, addSearch]);

  async function addStudent(studentProfileId: string) {
    setAddingId(studentProfileId);
    try {
      const res = await enrollStudentInClassAction({
        classId,
        studentProfileId,
      });
      if (res.ok) {
        toast.success(locale === "ar" ? "تمت إضافة الطالب" : "Student added");
        router.refresh();
      } else {
        const msg: Record<string, string> = {
          GENDER_MISMATCH:
            locale === "ar"
              ? "الطالب لا يطابق قيد الجنس للفصل"
              : "Student doesn't match the class gender restriction",
          CLASS_FULL: locale === "ar" ? "الفصل ممتلئ" : "Class is full",
          NOT_FOUND: locale === "ar" ? "غير موجود" : "Not found",
        };
        toast.error(msg[res.error] ?? res.error);
      }
    } finally {
      setAddingId(null);
    }
  }

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
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setShowAdd(true)}>
          <UserPlus className="me-2 h-4 w-4" />
          {locale === "ar" ? "إضافة طالب" : "Add Student"}
        </Button>
        <Button variant="cta" onClick={() => { setShowInvoice(true); loadPreview(); }}>
          <Receipt className="me-2 h-4 w-4" />{t("Classes.bulkInvoice")}
        </Button>
      </div>

      {/* Add Student dialog */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); setAddSearch(""); } }}>
        <DialogContent className="max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{locale === "ar" ? "إضافة طالب للفصل" : "Add Student to Class"}</DialogTitle>
            <DialogDescription>
              {locale === "ar"
                ? "اختر طالباً لتسجيله في هذا الفصل."
                : "Pick a student to enroll in this class."}
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder={locale === "ar" ? "ابحث بالاسم…" : "Search by name…"}
            value={addSearch}
            onChange={(e) => setAddSearch(e.target.value)}
          />
          <div className="max-h-[45vh] space-y-1 overflow-y-auto">
            {filteredAvailable.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {locale === "ar" ? "لا يوجد طلاب متاحون" : "No available students"}
              </p>
            ) : (
              filteredAvailable.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <span className="text-sm">
                    {locale === "ar" && s.nameAr ? s.nameAr : s.name}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={addingId === s.id}
                    onClick={() => addStudent(s.id)}
                  >
                    {addingId === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); setAddSearch(""); }}>
              {t("Common.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
