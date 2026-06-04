"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  StickyNote as StickyNoteIcon,
  Plus,
  Trash2,
  Loader2,
  CalendarClock,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { fmtDateLong } from "@/lib/format";
import {
  createNote,
  toggleNote,
  deleteNote,
  type StickyNoteDTO,
} from "../_actions/sticky-notes";

type Color = StickyNoteDTO["color"];

const COLORS: { value: Color; swatch: string; card: string }[] = [
  { value: "YELLOW", swatch: "bg-amber-300", card: "bg-amber-50 border-amber-200" },
  { value: "GREEN", swatch: "bg-emerald-300", card: "bg-emerald-50 border-emerald-200" },
  { value: "BLUE", swatch: "bg-sky-300", card: "bg-sky-50 border-sky-200" },
  { value: "PINK", swatch: "bg-pink-300", card: "bg-pink-50 border-pink-200" },
  { value: "PURPLE", swatch: "bg-violet-300", card: "bg-violet-50 border-violet-200" },
];

function cardClasses(color: Color): string {
  return COLORS.find((c) => c.value === color)?.card ?? COLORS[0].card;
}

export function StickyNotesWidget({
  initialNotes,
}: {
  initialNotes: StickyNoteDTO[];
}) {
  const t = useTranslations("StickyNotes");
  const locale = useLocale() as "ar" | "en";

  const [notes, setNotes] = useState<StickyNoteDTO[]>(initialNotes);
  const [body, setBody] = useState("");
  const [color, setColor] = useState<Color>("YELLOW");
  const [dueAt, setDueAt] = useState("");
  // Track per-note pending mutations so only the affected row shows a spinner.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isAdding, startAdd] = useTransition();

  function sortNotes(list: StickyNoteDTO[]): StickyNoteDTO[] {
    // Mirror the server ordering: open first, then newest first.
    return [...list].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }

  function handleAdd() {
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error(t("emptyError"));
      return;
    }
    startAdd(async () => {
      const res = await createNote({
        body: trimmed,
        color,
        dueAt: dueAt || null,
      });
      if (res.ok) {
        setNotes((prev) => sortNotes([res.data, ...prev]));
        setBody("");
        setDueAt("");
        setColor("YELLOW");
        toast.success(t("added"));
      } else {
        toast.error(t("saveError"));
      }
    });
  }

  function handleToggle(note: StickyNoteDTO) {
    setBusyId(note.id);
    startAdd(async () => {
      const res = await toggleNote(note.id);
      if (res.ok) {
        setNotes((prev) => sortNotes(prev.map((n) => (n.id === res.data.id ? res.data : n))));
      } else {
        toast.error(t("saveError"));
      }
      setBusyId(null);
    });
  }

  function handleDelete(id: string) {
    if (typeof window !== "undefined" && !window.confirm(t("deleteConfirm"))) return;
    setBusyId(id);
    startAdd(async () => {
      const res = await deleteNote(id);
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        toast.success(t("deleted"));
      } else {
        toast.error(t("saveError"));
      }
      setBusyId(null);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <StickyNoteIcon className="h-5 w-5 text-hajr-rose" />
          <h2 className="text-base font-semibold text-brand-navy">{t("title")}</h2>
          {notes.length > 0 && (
            <span className="ms-auto rounded-full bg-hajr-hover px-2 py-0.5 text-xs font-medium text-hajr-navy num">
              {notes.length}
            </span>
          )}
        </div>

        {/* Add form */}
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("addPlaceholder")}
            rows={2}
            maxLength={2000}
            className="min-h-[56px] resize-none"
            aria-label={t("addPlaceholder")}
          />
          <div className="flex flex-wrap items-center gap-2">
            {/* Color picker */}
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label={t("colorLabel")}>
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={color === c.value}
                  aria-label={t(`colors.${c.value}` as any)}
                  title={t(`colors.${c.value}` as any)}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "h-5 w-5 rounded-full ring-offset-1 transition-transform",
                    c.swatch,
                    color === c.value
                      ? "scale-110 ring-2 ring-hajr-navy"
                      : "opacity-70 hover:opacity-100"
                  )}
                />
              ))}
            </div>

            {/* Optional due date */}
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              <input
                type="datetime-local"
                lang="en-GB"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                aria-label={t("dueLabel")}
                className="rounded-md border border-hajr-gray-200 bg-white px-2 py-1 text-xs text-hajr-black focus-visible:border-hajr-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hajr-rose/30"
              />
            </label>

            <Button
              type="button"
              variant="cta"
              size="sm"
              onClick={handleAdd}
              disabled={isAdding || !body.trim()}
              className="ms-auto"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>{t("add")}</span>
            </Button>
          </div>
        </div>

        {/* List */}
        {notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-hajr-gray-200 py-8 text-center">
            <StickyNoteIcon className="mx-auto mb-2 h-6 w-6 text-hajr-gray-300" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => {
              const busy = busyId === note.id;
              const overdue =
                !note.done && note.dueAt && new Date(note.dueAt).getTime() < Date.now();
              return (
                <li
                  key={note.id}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border p-3 transition-opacity",
                    cardClasses(note.color),
                    note.done && "opacity-60"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(note)}
                    disabled={busy}
                    aria-label={note.done ? t("markUndone") : t("markDone")}
                    title={note.done ? t("markUndone") : t("markDone")}
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                      note.done
                        ? "border-hajr-deep-navy bg-hajr-deep-navy text-white"
                        : "border-hajr-gray-300 bg-white/70 hover:border-hajr-deep-navy"
                    )}
                  >
                    {busy ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : note.done ? (
                      <Check className="h-3 w-3" />
                    ) : null}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "whitespace-pre-wrap break-words text-sm text-hajr-black",
                        note.done && "line-through"
                      )}
                    >
                      {note.body}
                    </p>
                    {note.dueAt && (
                      <p
                        className={cn(
                          "mt-1 flex items-center gap-1 text-xs",
                          overdue ? "font-medium text-hajr-error" : "text-muted-foreground"
                        )}
                      >
                        <CalendarClock className="h-3 w-3 shrink-0" />
                        <span>{fmtDateLong(note.dueAt, locale)}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    disabled={busy}
                    aria-label={t("delete")}
                    title={t("delete")}
                    className="mt-0.5 shrink-0 rounded-md p-1 text-hajr-gray-400 transition-colors hover:bg-black/5 hover:text-hajr-error disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
