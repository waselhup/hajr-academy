"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface State {
  zoomTested: boolean;
  digitalToolsOk: boolean;
  mockClassDone: boolean;
  interactiveOk: boolean;
  classroomMgmt: boolean;
  selfRating: number | null;
  adminVerified: boolean;
  adminNotes: string;
}

const ITEMS: { key: keyof State; tKey: string }[] = [
  { key: "zoomTested", tKey: "item_zoom" },
  { key: "digitalToolsOk", tKey: "item_digital" },
  { key: "mockClassDone", tKey: "item_mock" },
  { key: "interactiveOk", tKey: "item_interactive" },
  { key: "classroomMgmt", tKey: "item_classroom" },
];

export function AdminReadinessForm({
  teacherId,
  initial,
}: {
  teacherId: string;
  initial: State;
}) {
  const t = useTranslations("Readiness");
  const router = useRouter();
  const [state, setState] = useState<State>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(key: keyof State) {
    setState((prev) => ({ ...prev, [key]: !prev[key] as never }));
  }

  async function save(verify: boolean) {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/teachers/${teacherId}/readiness`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminVerified: verify,
        adminNotes: state.adminNotes,
        override: {
          zoomTested: state.zoomTested,
          digitalToolsOk: state.digitalToolsOk,
          mockClassDone: state.mockClassDone,
          interactiveOk: state.interactiveOk,
          classroomMgmt: state.classroomMgmt,
        },
      }),
    });
    setSaving(false);
    if (res.ok) {
      setState((prev) => ({ ...prev, adminVerified: verify }));
      setMsg(t("savedOk"));
      router.refresh();
    } else {
      setMsg(t("savedFail"));
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-hajr-border bg-white p-6 shadow-sm">
      <div>
        <p className="mb-2 text-sm font-medium text-hajr-text">{t("checklist")}</p>
        <ul className="space-y-2">
          {ITEMS.map((item) => (
            <li key={item.key}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-hajr-border bg-hajr-ivory/40 p-3">
                <input
                  type="checkbox"
                  checked={Boolean(state[item.key])}
                  onChange={() => toggle(item.key)}
                  className="mt-1 h-5 w-5 rounded border-hajr-border accent-hajr-rose"
                />
                <span className="text-sm text-hajr-text">{t(item.tKey)}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-hajr-text">
          {t("teacherSelfRating")}:{" "}
          <span className="font-normal text-hajr-muted">
            {state.selfRating ?? "—"} / 5
          </span>
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-hajr-text">
          {t("adminNotes")}
        </label>
        <textarea
          value={state.adminNotes}
          onChange={(e) =>
            setState((prev) => ({ ...prev, adminNotes: e.target.value }))
          }
          rows={4}
          maxLength={4000}
          className="w-full rounded-lg border border-hajr-border px-3 py-2 text-sm focus:border-hajr-rose focus:outline-none focus:ring-2 focus:ring-hajr-rose/30"
        />
      </div>

      {msg && <p className="text-sm text-emerald-700">{msg}</p>}

      <div className="flex flex-wrap gap-3">
        {!state.adminVerified ? (
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="inline-flex h-11 items-center rounded-lg bg-amber-500 px-5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-60"
          >
            ✓ {t("verifyTeacher")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saving}
            className="inline-flex h-11 items-center rounded-lg border border-hajr-border bg-white px-5 text-sm font-medium text-hajr-text hover:bg-hajr-ivory disabled:opacity-60"
          >
            {t("unverifyTeacher")}
          </button>
        )}
        <button
          type="button"
          onClick={() => save(state.adminVerified)}
          disabled={saving}
          className="inline-flex h-11 items-center rounded-lg border border-hajr-border bg-white px-5 text-sm font-medium text-hajr-text hover:bg-hajr-ivory disabled:opacity-60"
        >
          {t("saveOnly")}
        </button>
      </div>
    </div>
  );
}
