"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { MeetingStatus } from "@prisma/client";

interface ActionItem {
  text: string;
  assigneeId?: string;
  done?: boolean;
  due?: string;
}
interface AttendeeShape {
  id: string;
  name: string;
  rsvp: string | null;
  attended: boolean;
}

const STATUSES: MeetingStatus[] = ["SCHEDULED", "LIVE", "ENDED", "CANCELLED"];

export function AdminMeetingDetail({
  meetingId,
  initial,
  attendees: initialAttendees,
}: {
  meetingId: string;
  initial: {
    minutes: string;
    actionItems: ActionItem[];
    status: MeetingStatus;
    zoomJoinUrl: string;
  };
  attendees: AttendeeShape[];
}) {
  const t = useTranslations("TeacherMeetings");
  const [minutes, setMinutes] = useState(initial.minutes);
  const [items, setItems] = useState<ActionItem[]>(initial.actionItems);
  const [status, setStatus] = useState<MeetingStatus>(initial.status);
  const [attendees, setAttendees] = useState<AttendeeShape[]>(initialAttendees);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function addItem() {
    setItems((prev) => [...prev, { text: "", done: false }]);
  }
  function updateItem(idx: number, patch: Partial<ActionItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const attendance = Object.fromEntries(
      attendees.map((a) => [a.id, a.attended])
    );
    const res = await fetch(`/api/admin/teacher-meetings/${meetingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        minutes,
        actionItems: items.filter((it) => it.text.trim()),
        status,
        attendance,
      }),
    });
    setSaving(false);
    if (res.ok) setMsg(t("savedOk"));
    else setMsg(t("savedFail"));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-hajr-border bg-white p-5 shadow-sm">
        <p className="mb-2 text-sm font-medium text-hajr-text">{t("status")}</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                s === status
                  ? "border-hajr-navy bg-hajr-navy text-white"
                  : "border-hajr-border bg-white text-hajr-text hover:bg-hajr-ivory"
              }`}
            >
              {t(`status_${s}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-hajr-border bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-hajr-text">{t("minutes")}</h3>
        <textarea
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          rows={8}
          maxLength={20000}
          className="w-full rounded-lg border border-hajr-border px-3 py-2 text-sm focus:border-hajr-rose focus:outline-none focus:ring-2 focus:ring-hajr-rose/30"
          placeholder={t("minutesPlaceholder")}
        />
      </div>

      <div className="rounded-xl border border-hajr-border bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-hajr-text">{t("actionItems")}</h3>
          <button
            type="button"
            onClick={addItem}
            className="rounded-md border border-hajr-border bg-white px-3 py-1.5 text-xs font-medium text-hajr-text hover:bg-hajr-ivory"
          >
            + {t("addActionItem")}
          </button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-hajr-muted">{t("noActionItems")}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 rounded-lg border border-hajr-border bg-hajr-ivory/40 p-2"
              >
                <input
                  type="checkbox"
                  checked={!!it.done}
                  onChange={(e) => updateItem(idx, { done: e.target.checked })}
                  className="h-5 w-5 accent-hajr-rose"
                />
                <input
                  type="text"
                  value={it.text}
                  onChange={(e) => updateItem(idx, { text: e.target.value })}
                  placeholder={t("itemPlaceholder")}
                  className="h-10 flex-1 rounded-lg border border-hajr-border bg-white px-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="rounded p-1.5 text-hajr-muted hover:bg-red-50 hover:text-red-600"
                  title={t("remove")}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-hajr-border bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-hajr-text">{t("attendance")}</h3>
        <ul className="space-y-2">
          {attendees.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-hajr-border bg-hajr-ivory/40 px-3 py-2"
            >
              <div className="text-sm text-hajr-text">{a.name}</div>
              <div className="flex items-center gap-3">
                {a.rsvp && (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium uppercase text-hajr-muted">
                    RSVP: {a.rsvp}
                  </span>
                )}
                <label className="flex items-center gap-2 text-xs text-hajr-muted">
                  <input
                    type="checkbox"
                    checked={a.attended}
                    onChange={(e) =>
                      setAttendees((prev) =>
                        prev.map((x) =>
                          x.id === a.id ? { ...x, attended: e.target.checked } : x
                        )
                      )
                    }
                    className="h-4 w-4 accent-hajr-rose"
                  />
                  {t("attended")}
                </label>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {msg && <p className="text-sm text-emerald-700">{msg}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex h-11 min-w-[140px] items-center justify-center rounded-lg bg-hajr-rose px-5 text-sm font-medium text-white shadow-sm hover:bg-hajr-rose/90 disabled:opacity-60"
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>
    </div>
  );
}
