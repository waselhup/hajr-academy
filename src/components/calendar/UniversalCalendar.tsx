"use client";

/**
 * UniversalCalendar — the one calendar used everywhere.
 *
 * - Self-contained: fetches `/api/calendar/events` for the visible date range.
 * - Views: Month (default), Week, Day, Agenda. Mobile auto-defaults to Agenda.
 * - Color-coded by CalendarEventType per spec.
 * - Click an event → Dialog with details. Creator (or admin) can edit/delete.
 * - RTL aware. 44px tap targets.
 *
 * Built with date-fns + a CSS grid — avoids heavy calendar deps.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  addDays, addMonths, addWeeks,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  isSameDay, isSameMonth, isToday,
  format,
} from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtDateLong } from "@/lib/format";

export type EventType =
  | "CLASS" | "EXAM" | "HOLIDAY" | "MEETING"
  | "PAYMENT_DUE" | "PLACEMENT_TEST"
  | "SPEAKING_CLUB" | "DEADLINE" | "CUSTOM";

export interface CalendarEventDto {
  id: string;
  type: EventType;
  title: string;
  titleAr: string;
  description: string | null;
  descriptionAr: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  userId: string | null;
  classId: string | null;
  teacherId: string | null;
  studentId: string | null;
  audienceRole: string | null;
  isGlobal: boolean;
  createdBy: string;
}

type View = "month" | "week" | "day" | "agenda";

const TYPE_STYLES: Record<EventType, { bg: string; text: string; dot: string }> = {
  CLASS:          { bg: "bg-hajr-deep-navy",    text: "text-white", dot: "bg-hajr-deep-navy" },
  EXAM:           { bg: "bg-hajr-rose",         text: "text-white", dot: "bg-hajr-rose" },
  HOLIDAY:        { bg: "bg-hajr-mint",         text: "text-hajr-deep-navy", dot: "bg-hajr-mint" },
  MEETING:        { bg: "bg-hajr-navy",         text: "text-white", dot: "bg-hajr-navy" },
  PAYMENT_DUE:    { bg: "bg-amber-500",         text: "text-white", dot: "bg-amber-500" },
  PLACEMENT_TEST: { bg: "bg-blue-600",          text: "text-white", dot: "bg-blue-600" },
  SPEAKING_CLUB:  { bg: "bg-emerald-600",       text: "text-white", dot: "bg-emerald-600" },
  DEADLINE:       { bg: "bg-red-600",           text: "text-white", dot: "bg-red-600" },
  CUSTOM:         { bg: "bg-slate-500",         text: "text-white", dot: "bg-slate-500" },
};

export function UniversalCalendar({ currentUserId, isAdmin }: { currentUserId: string; isAdmin: boolean }) {
  const t = useTranslations("Calendar");
  const tType = useTranslations("Calendar");
  const locale = useLocale();
  const isAr = locale === "ar";
  const dfLocale = isAr ? arLocale : enUS;

  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<View>(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) return "agenda";
    return "month";
  });
  const [events, setEvents] = useState<CalendarEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalendarEventDto | null>(null);
  const [creating, setCreating] = useState(false);

  const range = useMemo(() => {
    if (view === "day") {
      return { from: dayStart(cursor), to: dayEnd(cursor) };
    }
    if (view === "week") {
      return {
        from: startOfWeek(cursor, { locale: dfLocale, weekStartsOn: 6 }),
        to: endOfWeek(cursor, { locale: dfLocale, weekStartsOn: 6 }),
      };
    }
    // month + agenda → cover the whole month + grid padding
    const mFrom = startOfMonth(cursor);
    const mTo = endOfMonth(cursor);
    return {
      from: startOfWeek(mFrom, { locale: dfLocale, weekStartsOn: 6 }),
      to: endOfWeek(mTo, { locale: dfLocale, weekStartsOn: 6 }),
    };
  }, [cursor, view, dfLocale]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/calendar/events?from=${range.from.toISOString()}&to=${range.to.toISOString()}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      setEvents(json.events ?? []);
    } catch (e) {
      console.error("[calendar] fetch failed", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const goPrev = () => setCursor((c) =>
    view === "day" ? addDays(c, -1)
    : view === "week" ? addWeeks(c, -1)
    : addMonths(c, -1)
  );
  const goNext = () => setCursor((c) =>
    view === "day" ? addDays(c, 1)
    : view === "week" ? addWeeks(c, 1)
    : addMonths(c, 1)
  );
  const goToday = () => setCursor(new Date());

  const onDelete = async (id: string) => {
    const r = await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
    if (r.ok) {
      setSelected(null);
      fetchEvents();
    }
  };

  return (
    <div className="rounded-2xl border border-hajr-border bg-white shadow-card">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-hajr-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goPrev} aria-label="prev">
            <ChevronLeft className="h-5 w-5 rtl-flip" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goNext} aria-label="next">
            <ChevronRight className="h-5 w-5 rtl-flip" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            {t("today")}
          </Button>
          <div className="ms-2 text-base font-semibold text-hajr-text">
            {format(cursor, view === "day" ? "PP" : "LLLL yyyy", { locale: dfLocale })}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ViewBtn current={view} v="month"  onClick={() => setView("month")}  label={t("month")} />
          <ViewBtn current={view} v="week"   onClick={() => setView("week")}   label={t("week")} />
          <ViewBtn current={view} v="day"    onClick={() => setView("day")}    label={t("day")} />
          <ViewBtn current={view} v="agenda" onClick={() => setView("agenda")} label={t("agenda")} />
          <Button variant="cta" size="sm" className="ms-2 gap-1" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            {t("newEvent")}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 sm:p-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-hajr-muted">
            <CalendarIcon className="me-2 h-4 w-4" />
            {/* generic loading */}…
          </div>
        ) : view === "month" ? (
          <MonthGrid
            cursor={cursor}
            events={events}
            isAr={isAr}
            onSelect={setSelected}
            dfLocale={dfLocale}
          />
        ) : view === "week" ? (
          <WeekGrid
            cursor={cursor}
            events={events}
            isAr={isAr}
            onSelect={setSelected}
            dfLocale={dfLocale}
          />
        ) : view === "day" ? (
          <DayList
            cursor={cursor}
            events={events}
            isAr={isAr}
            onSelect={setSelected}
            emptyLabel={t("noEvents")}
          />
        ) : (
          <Agenda
            events={events}
            isAr={isAr}
            onSelect={setSelected}
            emptyLabel={t("noEvents")}
          />
        )}
      </div>

      {/* Event dialog */}
      {selected && (
        <EventDialog
          event={selected}
          isAr={isAr}
          canModify={isAdmin || selected.createdBy === currentUserId}
          onClose={() => setSelected(null)}
          onDelete={() => onDelete(selected.id)}
          t={t}
          tType={tType}
        />
      )}

      {/* Create dialog */}
      {creating && (
        <CreateDialog
          isAdmin={isAdmin}
          isAr={isAr}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); fetchEvents(); }}
          t={t}
        />
      )}
    </div>
  );
}

/* ──────────── sub-components ──────────── */

function ViewBtn({
  current, v, onClick, label,
}: { current: View; v: View; onClick: () => void; label: string }) {
  const active = current === v;
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-hajr-deep-navy text-white"
          : "text-hajr-muted hover:bg-hajr-hover hover:text-hajr-text"
      )}
    >
      {label}
    </button>
  );
}

function MonthGrid({
  cursor, events, isAr, onSelect, dfLocale,
}: {
  cursor: Date; events: CalendarEventDto[]; isAr: boolean;
  onSelect: (e: CalendarEventDto) => void;
  dfLocale: typeof arLocale;
}) {
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { locale: dfLocale, weekStartsOn: 6 });
  const gridEnd = endOfWeek(monthEnd, { locale: dfLocale, weekStartsOn: 6 });
  const days: Date[] = [];
  let d = gridStart;
  while (d <= gridEnd) { days.push(d); d = addDays(d, 1); }

  const dayHeaders = Array.from({ length: 7 }, (_, i) =>
    format(addDays(gridStart, i), "EEEEEE", { locale: dfLocale })
  );

  return (
    <div className="overflow-hidden rounded-xl border border-hajr-border">
      <div className="grid grid-cols-7 border-b border-hajr-border bg-hajr-surface">
        {dayHeaders.map((h) => (
          <div key={h} className="px-2 py-2 text-center text-xs font-medium text-hajr-muted">
            {h}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inMonth = isSameMonth(day, monthStart);
          const today = isToday(day);
          const dayEvents = events.filter((e) => isSameDay(new Date(e.startAt), day));
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[88px] border-b border-s border-hajr-border p-1.5 text-xs",
                !inMonth && "bg-hajr-surface/60 text-hajr-light"
              )}
            >
              <div className={cn(
                "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-[0.7rem] font-semibold",
                today ? "bg-hajr-rose text-white" : "text-hajr-text"
              )}>
                {format(day, "d", { locale: dfLocale })}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onSelect(ev)}
                    className={cn(
                      "w-full truncate rounded px-1.5 py-0.5 text-start text-[0.7rem] font-medium",
                      TYPE_STYLES[ev.type].bg,
                      TYPE_STYLES[ev.type].text
                    )}
                  >
                    {isAr ? ev.titleAr : ev.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[0.65rem] text-hajr-muted">+{dayEvents.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  cursor, events, isAr, onSelect, dfLocale,
}: {
  cursor: Date; events: CalendarEventDto[]; isAr: boolean;
  onSelect: (e: CalendarEventDto) => void;
  dfLocale: typeof arLocale;
}) {
  const start = startOfWeek(cursor, { locale: dfLocale, weekStartsOn: 6 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="grid gap-2 sm:grid-cols-7">
      {days.map((day) => {
        const dayEvents = events.filter((e) => isSameDay(new Date(e.startAt), day));
        const today = isToday(day);
        return (
          <div key={day.toISOString()} className="rounded-lg border border-hajr-border p-2">
            <div className={cn(
              "mb-2 text-xs font-medium",
              today ? "text-hajr-rose" : "text-hajr-muted"
            )}>
              {format(day, "EEE d", { locale: dfLocale })}
            </div>
            <div className="space-y-1">
              {dayEvents.length === 0 ? (
                <div className="text-[0.7rem] text-hajr-light">—</div>
              ) : dayEvents.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => onSelect(ev)}
                  className={cn(
                    "block w-full truncate rounded px-2 py-1 text-start text-xs",
                    TYPE_STYLES[ev.type].bg, TYPE_STYLES[ev.type].text
                  )}
                >
                  {isAr ? ev.titleAr : ev.title}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayList({
  cursor, events, isAr, onSelect, emptyLabel,
}: {
  cursor: Date; events: CalendarEventDto[]; isAr: boolean;
  onSelect: (e: CalendarEventDto) => void; emptyLabel: string;
}) {
  const today = events.filter((e) => isSameDay(new Date(e.startAt), cursor));
  if (today.length === 0) {
    return <div className="py-10 text-center text-sm text-hajr-muted">{emptyLabel}</div>;
  }
  return (
    <ul className="space-y-2">
      {today.map((ev) => (
        <EventListItem key={ev.id} ev={ev} isAr={isAr} onClick={() => onSelect(ev)} />
      ))}
    </ul>
  );
}

function Agenda({
  events, isAr, onSelect, emptyLabel,
}: {
  events: CalendarEventDto[]; isAr: boolean;
  onSelect: (e: CalendarEventDto) => void; emptyLabel: string;
}) {
  if (events.length === 0) {
    return <div className="py-10 text-center text-sm text-hajr-muted">{emptyLabel}</div>;
  }
  // Group by day.
  const byDay = new Map<string, CalendarEventDto[]>();
  for (const ev of events) {
    const k = new Date(ev.startAt).toDateString();
    const list = byDay.get(k) ?? [];
    list.push(ev);
    byDay.set(k, list);
  }
  return (
    <ul className="space-y-4">
      {Array.from(byDay.entries()).map(([day, list]) => (
        <li key={day}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-hajr-muted">
            {fmtDateLong(new Date(day), isAr ? "ar" : "en")}
          </div>
          <ul className="space-y-1.5">
            {list.map((ev) => (
              <EventListItem key={ev.id} ev={ev} isAr={isAr} onClick={() => onSelect(ev)} />
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function EventListItem({
  ev, isAr, onClick,
}: { ev: CalendarEventDto; isAr: boolean; onClick: () => void }) {
  const dot = TYPE_STYLES[ev.type].dot;
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-lg border border-hajr-border bg-white p-3 text-start transition-colors hover:bg-hajr-hover"
      >
        <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} />
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-medium text-hajr-text">
            {isAr ? ev.titleAr : ev.title}
          </div>
          <div className="text-xs text-hajr-muted">
            {ev.allDay ? "—" : new Date(ev.startAt).toLocaleTimeString(isAr ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </button>
    </li>
  );
}

function EventDialog({
  event, isAr, canModify, onClose, onDelete, t, tType,
}: {
  event: CalendarEventDto;
  isAr: boolean;
  canModify: boolean;
  onClose: () => void;
  onDelete: () => void;
  t: (k: string) => string;
  tType: (k: string) => string;
}) {
  const title = isAr ? event.titleAr : event.title;
  const desc = isAr ? event.descriptionAr : event.description;
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", TYPE_STYLES[event.type].dot)} />
              <span className="text-[0.7rem] font-medium uppercase tracking-wide text-hajr-muted">
                {tType("type_" + event.type)}
              </span>
            </div>
            <h3 className="text-lg font-bold text-hajr-text">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-hajr-muted transition-colors hover:bg-hajr-hover"
            aria-label="close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {desc && (
          <p className="mb-4 text-sm text-hajr-body">{desc}</p>
        )}
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-hajr-surface p-3 text-sm">
          <div>
            <div className="text-[0.7rem] text-hajr-muted">{t("eventStart")}</div>
            <div className="font-medium text-hajr-text">
              {event.allDay ? t("eventAllDay") : start.toLocaleString(isAr ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          </div>
          <div>
            <div className="text-[0.7rem] text-hajr-muted">{t("eventEnd")}</div>
            <div className="font-medium text-hajr-text">
              {event.allDay ? t("eventAllDay") : end.toLocaleString(isAr ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          </div>
        </div>
        {canModify && (
          <div className="mt-4 flex justify-end">
            <Button variant="destructive" size="sm" onClick={onDelete} className="gap-1">
              <Trash2 className="h-4 w-4" />
              {/* generic delete label */}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateDialog({
  isAdmin, isAr, onClose, onCreated, t,
}: {
  isAdmin: boolean; isAr: boolean;
  onClose: () => void; onCreated: () => void;
  t: (k: string) => string;
}) {
  const [type, setType] = useState<EventType>("MEETING");
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [startAt, setStartAt] = useState(() => toInputDateTime(new Date()));
  const [endAt, setEndAt] = useState(() => toInputDateTime(new Date(Date.now() + 60 * 60 * 1000)));
  const [isGlobal, setIsGlobal] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title || titleAr || "Event",
          titleAr: titleAr || title || "حدث",
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          isGlobal: isAdmin && isGlobal,
        }),
      });
      if (r.ok) onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-hajr-text">{t("newEvent")}</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-hajr-muted hover:bg-hajr-hover" aria-label="close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-hajr-muted">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EventType)}
              className="block w-full rounded-lg border border-hajr-border bg-white px-3 py-2 text-sm"
            >
              {(["CUSTOM","MEETING","CLASS","EXAM","HOLIDAY","PAYMENT_DUE","PLACEMENT_TEST","SPEAKING_CLUB","DEADLINE"] as EventType[]).map((tp) => (
                <option key={tp} value={tp}>{t("type_" + tp)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-hajr-muted">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full rounded-lg border border-hajr-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-hajr-muted">عنوان عربي</label>
            <input
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              dir="rtl"
              className="block w-full rounded-lg border border-hajr-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-hajr-muted">{t("eventStart")}</label>
              <input
                type="datetime-local"
                lang={isAr ? "ar" : "en"}
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="block w-full rounded-lg border border-hajr-border bg-white px-2 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-hajr-muted">{t("eventEnd")}</label>
              <input
                type="datetime-local"
                lang={isAr ? "ar" : "en"}
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="block w-full rounded-lg border border-hajr-border bg-white px-2 py-2 text-sm"
              />
            </div>
          </div>
          {isAdmin && (
            <label className="flex items-center gap-2 rounded-lg border border-hajr-border bg-hajr-surface px-3 py-2">
              <input
                type="checkbox"
                checked={isGlobal}
                onChange={(e) => setIsGlobal(e.target.checked)}
              />
              <span className="text-xs">Visible to everyone</span>
            </label>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="cta" size="sm" onClick={submit} disabled={saving}>
            {saving ? "…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function dayStart(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0); }
function dayEnd(d: Date): Date   { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999); }

function toInputDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
