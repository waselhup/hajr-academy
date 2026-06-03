"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

interface TeacherOption {
  id: string;
  name: string;
}

export function NewMeetingDialog({ teachers }: { teachers: TeacherOption[] }) {
  const t = useTranslations("TeacherMeetings");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [agenda, setAgenda] = useState("");
  const [agendaAr, setAgendaAr] = useState("");
  const [zoomJoinUrl, setZoomJoinUrl] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAttendee(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submit() {
    setError(null);
    setSaving(true);
    const res = await fetch("/api/admin/teacher-meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        titleAr,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        durationMin,
        agenda,
        agendaAr,
        zoomJoinUrl,
        attendeeTeacherIds: selected,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed");
      return;
    }
    setOpen(false);
    setTitle("");
    setTitleAr("");
    setScheduledAt("");
    setAgenda("");
    setAgendaAr("");
    setZoomJoinUrl("");
    setSelected([]);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center rounded-lg bg-hajr-rose px-5 text-sm font-medium text-white shadow-sm hover:bg-hajr-rose/90"
      >
        + {t("newMeeting")}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-hajr-text">{t("newMeeting")}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded p-1 text-hajr-muted hover:bg-hajr-ivory"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("titleEn")}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 w-full rounded-lg border border-hajr-border px-3 text-sm"
            />
          </Field>
          <Field label={t("titleAr")}>
            <input
              type="text"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              className="h-11 w-full rounded-lg border border-hajr-border px-3 text-sm"
            />
          </Field>
          <Field label={t("scheduledAt")}>
            <input
              type="datetime-local"
              lang={locale}
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-11 w-full rounded-lg border border-hajr-border px-3 text-sm"
            />
          </Field>
          <Field label={t("durationMin")}>
            <input
              type="number"
              lang={locale}
              min={15}
              max={480}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className="h-11 w-full rounded-lg border border-hajr-border px-3 text-sm"
            />
          </Field>
          <Field label={t("agendaEn")}>
            <textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-hajr-border px-3 py-2 text-sm"
            />
          </Field>
          <Field label={t("agendaAr")}>
            <textarea
              value={agendaAr}
              onChange={(e) => setAgendaAr(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-hajr-border px-3 py-2 text-sm"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("zoomLink")}>
              <input
                type="url"
                value={zoomJoinUrl}
                onChange={(e) => setZoomJoinUrl(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="h-11 w-full rounded-lg border border-hajr-border px-3 text-sm"
              />
            </Field>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-hajr-text">{t("selectAttendees")}</p>
          <div className="grid max-h-60 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-hajr-border p-3">
            {teachers.map((tp) => (
              <label
                key={tp.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(tp.id)}
                  onChange={() => toggleAttendee(tp.id)}
                  className="h-4 w-4 rounded border-hajr-border accent-hajr-rose"
                />
                <span>{tp.name}</span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-hajr-muted">
            {selected.length} {t("selectedCount")}
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-11 rounded-lg border border-hajr-border bg-white px-4 text-sm font-medium text-hajr-text hover:bg-hajr-ivory"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex h-11 min-w-[140px] items-center justify-center rounded-lg bg-hajr-rose px-5 text-sm font-medium text-white shadow-sm hover:bg-hajr-rose/90 disabled:opacity-60"
          >
            {saving ? t("creating") : t("create")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-hajr-text">{label}</span>
      {children}
    </label>
  );
}
