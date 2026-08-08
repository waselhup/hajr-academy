"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import {
  Plus, Loader2, Trash2, Eye, EyeOff, CalendarPlus, Users, ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateField, TimeField } from "@/components/ui/western-fields";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  createTrialSlotsAction,
  toggleTrialSlotAction,
  deleteTrialSlotAction,
} from "../_actions/slot-actions";

export interface AdminSlot {
  id: string;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  booked: number;
  isActive: boolean;
  note: string | null;
  dayLabel: string;
  timeLabel: string;
  isPast: boolean;
}

export function TrialSlotsClient({ slots }: { slots: AdminSlot[] }) {
  const isAr = useLocale() === "ar";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("16:00");
  const [durationMinutes, setDuration] = useState(30);
  const [capacity, setCapacity] = useState(1);
  const [note, setNote] = useState("");
  const [repeatWeeks, setRepeatWeeks] = useState(1);

  const upcoming = slots.filter((s) => !s.isPast);
  const openSeats = upcoming
    .filter((s) => s.isActive)
    .reduce((n, s) => n + Math.max(0, s.capacity - s.booked), 0);

  function submit() {
    if (!date || !time) {
      toast.error(isAr ? "اختر التاريخ والوقت." : "Pick a date and a time.");
      return;
    }
    startTransition(async () => {
      const res = await createTrialSlotsAction({
        date, time, durationMinutes, capacity,
        note: note || null,
        repeatWeeks,
      });
      if (!res.ok) { toast.error(res.error); return; }
      const { created, skipped } = res.data;
      toast.success(
        isAr
          ? `أُضيف ${created} موعد${skipped ? ` (تُخطّي ${skipped})` : ""}`
          : `${created} slot(s) added${skipped ? ` (${skipped} skipped)` : ""}`
      );
      setOpen(false);
      setNote("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarPlus className="h-5 w-5" />
              {isAr ? "المواعيد المتاحة للحصص التجريبية" : "Published trial times"}
            </CardTitle>
            <CardDescription>
              {isAr
                ? "ما تنشره هنا هو ما يراه الزائر في صفحة الحجز. لا يظهر شيء لم تنشره."
                : "What you publish here is exactly what visitors can pick. Nothing else is offered."}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`/${isAr ? "ar" : "en"}/trial`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="me-2 h-4 w-4" />
                {isAr ? "معاينة الصفحة" : "Preview page"}
              </a>
            </Button>
            <Button variant="cta" size="sm" onClick={() => setOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              {isAr ? "إضافة موعد" : "Add a time"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* The number that matters: can anyone book right now? */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-card bg-muted/40 p-3 text-sm">
          <span>
            {isAr ? "مواعيد قادمة: " : "Upcoming slots: "}
            <span className="num font-bold">{upcoming.length}</span>
          </span>
          <span>
            {isAr ? "مقاعد متاحة للحجز: " : "Seats open to book: "}
            <span className={`num font-bold ${openSeats === 0 ? "text-hajr-rose" : "text-hajr-success"}`}>
              {openSeats}
            </span>
          </span>
          {openSeats === 0 && (
            <span className="text-xs text-hajr-rose">
              {isAr
                ? "لا يستطيع أحد الحجز الآن — أضف مواعيد."
                : "Nobody can book right now — add some times."}
            </span>
          )}
        </div>

        {upcoming.length === 0 ? (
          <p className="rounded-card border border-dashed border-hajr-border p-6 text-center text-sm text-muted-foreground">
            {isAr
              ? "لا توجد مواعيد قادمة. اضغط «إضافة موعد»."
              : "No upcoming times. Click “Add a time”."}
          </p>
        ) : (
          <div className="divide-y divide-hajr-border rounded-card border border-hajr-border">
            {upcoming.map((s) => {
              const full = s.booked >= s.capacity;
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-[190px] flex-1">
                    <div className="num font-medium">{s.dayLabel}</div>
                    <div className="num text-xs text-muted-foreground">{s.timeLabel}</div>
                    {s.note && <div className="text-xs text-muted-foreground">{s.note}</div>}
                  </div>

                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className={`num font-semibold ${full ? "text-hajr-rose" : ""}`}>
                      {s.booked} / {s.capacity}
                    </span>
                  </span>

                  {!s.isActive ? (
                    <Badge variant="warning">{isAr ? "مخفي" : "Hidden"}</Badge>
                  ) : full ? (
                    <Badge variant="danger">{isAr ? "مكتمل" : "Full"}</Badge>
                  ) : (
                    <Badge variant="success">{isAr ? "متاح" : "Open"}</Badge>
                  )}

                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      title={isAr ? "إظهار / إخفاء" : "Show / hide"}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await toggleTrialSlotAction(s.id);
                          if (!res.ok) toast.error(res.error);
                          router.refresh();
                        })
                      }
                    >
                      {s.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-hajr-rose hover:bg-hajr-rose/10"
                      disabled={isPending}
                      title={isAr ? "حذف" : "Delete"}
                      onClick={() => {
                        if (!window.confirm(isAr ? "حذف هذا الموعد؟" : "Delete this time?")) return;
                        startTransition(async () => {
                          const res = await deleteTrialSlotAction(s.id);
                          if (!res.ok) toast.error(res.error);
                          else toast.success(isAr ? "حُذف الموعد" : "Time deleted");
                          router.refresh();
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {open && (
        <Dialog open onOpenChange={(o) => !o && setOpen(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{isAr ? "إضافة موعد تجريبي" : "Add a trial time"}</DialogTitle>
              <DialogDescription>
                {isAr
                  ? "بتوقيت السعودية. يمكنك تكراره أسبوعياً لتغطية الشهر دفعة واحدة."
                  : "KSA time. Repeat it weekly to fill the month in one go."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{isAr ? "التاريخ" : "Date"}</Label>
                  <DateField value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{isAr ? "وقت البداية" : "Start time"}</Label>
                  <TimeField value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{isAr ? "المدة (دقيقة)" : "Duration (min)"}</Label>
                  <Input
                    type="number" min={10} max={180} step={5}
                    value={durationMinutes}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{isAr ? "عدد المقاعد" : "Seats"}</Label>
                  <Input
                    type="number" min={1} max={50}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isAr ? "كم شخصاً يمكنه حجز هذا الموعد" : "How many people may book it"}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{isAr ? "تكرار أسبوعي" : "Repeat weekly"}</Label>
                <Input
                  type="number" min={1} max={12}
                  value={repeatWeeks}
                  onChange={(e) => setRepeatWeeks(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  {isAr
                    ? "1 = مرة واحدة. 4 = نفس اليوم والوقت لأربعة أسابيع."
                    : "1 = once. 4 = the same day and time for four weeks."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>{isAr ? "ملاحظة تظهر للزائر (اختياري)" : "Note shown to visitors (optional)"}</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={isAr ? "مثال: للمرحلة الابتدائية" : "e.g. primary school"}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={submit} disabled={isPending}>
                {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {isAr ? "نشر الموعد" : "Publish"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
