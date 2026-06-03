"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Calendar, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { teacherColor, fmtRiyadh } from "@/lib/format";
import { generateSessionsAction } from "../../_actions/schedule";

type Sess = {
  id: string; classId: string; className: string; classNameAr: string | null; cohortCode: string;
  teacherId: string; teacherName: string;
  programCode: string;
  scheduledDate: string; durationMinutes: number; status: string;
};

const DAY_KEYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export function ScheduleClient({
  sessions, weekStart, teachers, programs, classes,
}: {
  sessions: Sess[]; weekStart: string;
  teachers: { id: string; name: string }[];
  programs: { id: string; code: string; nameEn: string }[];
  classes: { id: string; name: string; cohortCode: string }[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const [view, setView] = useState<"week" | "day" | "agenda">("week");
  const [selected, setSelected] = useState<Sess | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genClassId, setGenClassId] = useState("");
  const [weeksAhead, setWeeksAhead] = useState(12);
  const [isPending, startTransition] = useTransition();

  const wStart = useMemo(() => new Date(weekStart), [weekStart]);
  const days = useMemo(() => {
    const out: { idx: number; date: Date; key: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(wStart);
      d.setDate(wStart.getDate() + i);
      out.push({ idx: i, date: d, key: DAY_KEYS[i] });
    }
    return out;
  }, [wStart]);

  function gotoWeek(delta: number) {
    const next = new Date(wStart);
    next.setDate(next.getDate() + delta * 7);
    const p = new URLSearchParams(sp.toString());
    p.set("week", next.toISOString().slice(0, 10));
    router.push(`${pathname}?${p.toString()}`);
  }

  function gotoToday() {
    const p = new URLSearchParams(sp.toString());
    p.delete("week");
    router.push(`${pathname}?${p.toString()}`);
  }

  function generate() {
    if (!genClassId) return;
    startTransition(async () => {
      const res = await generateSessionsAction({ classId: genClassId, weeksAhead });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(t("Schedule.generated", { n: res.data.created }));
      setShowGenerate(false);
      router.refresh();
    });
  }

  const sessionsByDay: Sess[][] = days.map((d) =>
    sessions.filter((s) => {
      const sd = new Date(s.scheduledDate);
      return sd.toDateString() === d.date.toDateString();
    })
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-5 w-5 text-brand-rose" />{t("Schedule.title")}</h1>
          <p className="text-sm text-muted-foreground num">{fmtRiyadh(wStart, "MMM d")} – {fmtRiyadh(new Date(wStart.getTime() + 6 * 86400_000), "MMM d, yyyy")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border">
            <Button variant={view === "week" ? "default" : "ghost"} size="sm" onClick={() => setView("week")}>{t("Schedule.weekView")}</Button>
            <Button variant={view === "day" ? "default" : "ghost"} size="sm" onClick={() => setView("day")}>{t("Schedule.dayView")}</Button>
            <Button variant={view === "agenda" ? "default" : "ghost"} size="sm" onClick={() => setView("agenda")}>{t("Schedule.agendaView")}</Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => gotoWeek(-1)}><ChevronLeft className="h-4 w-4 rtl-flip" /></Button>
          <Button variant="outline" size="sm" onClick={gotoToday}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => gotoWeek(1)}><ChevronRight className="h-4 w-4 rtl-flip" /></Button>
          <Button variant="cta" size="sm" onClick={() => setShowGenerate(true)}>{t("Schedule.generate")}</Button>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={sp.get("teacher") ?? "_all_"} onValueChange={(v) => {
            const p = new URLSearchParams(sp.toString());
            if (v === "_all_") p.delete("teacher"); else p.set("teacher", v);
            router.push(`${pathname}?${p.toString()}`);
          }}>
            <SelectTrigger className="w-48"><SelectValue placeholder={t("Common.teachers")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">{t("Common.all")} — {t("Common.teachers")}</SelectItem>
              {teachers.map((teacher) => <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sp.get("program") ?? "_all_"} onValueChange={(v) => {
            const p = new URLSearchParams(sp.toString());
            if (v === "_all_") p.delete("program"); else p.set("program", v);
            router.push(`${pathname}?${p.toString()}`);
          }}>
            <SelectTrigger className="w-48"><SelectValue placeholder={t("Nav.programs")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">{t("Common.all")} — {t("Nav.programs")}</SelectItem>
              {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.nameEn}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {view === "agenda" ? (
        <Card>
          <CardContent className="p-0 divide-y">
            {sessions.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{t("Common.noData")}</p>
            ) : sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className="flex w-full items-center justify-between gap-3 p-4 text-start hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: teacherColor(s.teacherId) }} />
                  <div>
                    <div className="text-sm font-medium">{locale === "ar" && s.classNameAr ? s.classNameAr : s.className}</div>
                    <div className="text-xs text-muted-foreground">{s.teacherName} · {t("Programs." + s.programCode as any)}</div>
                  </div>
                </div>
                <div className="text-end text-xs">
                  <div className="font-medium num">{fmtRiyadh(s.scheduledDate, "EEE MMM d HH:mm")}</div>
                  <Badge variant={s.status === "LIVE" ? "rose" : "info"}>{s.status}</Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b">
              {days.map((d) => (
                <div key={d.idx} className="border-e p-2 text-center text-xs font-medium last:border-e-0">
                  <div>{t("Days." + d.key as any)}</div>
                  <div className="text-muted-foreground num">{d.date.getDate()}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-[400px]">
              {sessionsByDay.map((daySessions, idx) => (
                <div key={idx} className="border-e p-2 space-y-1 last:border-e-0">
                  {daySessions.length === 0 ? (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  ) : daySessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className="w-full rounded-md p-1.5 text-start text-xs"
                      style={{ backgroundColor: `${teacherColor(s.teacherId)}25`, borderInlineStart: `3px solid ${teacherColor(s.teacherId)}` }}
                    >
                      <div className="font-medium num">{fmtRiyadh(s.scheduledDate, "HH:mm")}</div>
                      <div className="truncate">{locale === "ar" && s.classNameAr ? s.classNameAr : s.className}</div>
                      <div className="truncate text-muted-foreground">{s.teacherName}</div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selected && (
        <Sheet open onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent side="right" className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{locale === "ar" && selected.classNameAr ? selected.classNameAr : selected.className}</SheetTitle>
              <SheetDescription>{selected.cohortCode}</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-3 text-sm">
              <Row label={t("Classes.teacher")} value={selected.teacherName} />
              <Row label="Date" value={fmtRiyadh(selected.scheduledDate, "EEE MMM d HH:mm")} />
              <Row label={t("Classes.duration")} value={`${selected.durationMinutes} min`} />
              <Row label={t("Common.status")} value={<Badge variant={selected.status === "LIVE" ? "rose" : "info"}>{selected.status}</Badge>} />
              <Row label={t("Nav.programs")} value={t("Programs." + selected.programCode as any)} />
            </div>
            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => router.push(`/${locale}/admin/classes/${selected.classId}`)}>{t("Common.view")}</Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Schedule.generate")}</DialogTitle>
            <DialogDescription>{t("Schedule.title")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("Nav.classes")}</Label>
              <Select value={genClassId} onValueChange={setGenClassId}>
                <SelectTrigger><SelectValue placeholder={t("Common.search")} /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.cohortCode} — {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("Schedule.generateWeeks")}</Label>
              <Input type="number" min={1} max={52} value={weeksAhead} onChange={(e) => setWeeksAhead(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerate(false)}>{t("Common.cancel")}</Button>
            <Button onClick={generate} disabled={!genClassId || isPending}>
              {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{t("Common.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b pb-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium num">{value}</span>
    </div>
  );
}
