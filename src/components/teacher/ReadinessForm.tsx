"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface State {
  zoomTested: boolean;
  digitalToolsOk: boolean;
  mockClassDone: boolean;
  interactiveOk: boolean;
  classroomMgmt: boolean;
  selfRating: number | null;
}

const ITEMS: { key: keyof Omit<State, "selfRating">; tKey: string }[] = [
  { key: "zoomTested", tKey: "item_zoom" },
  { key: "digitalToolsOk", tKey: "item_digital" },
  { key: "mockClassDone", tKey: "item_mock" },
  { key: "interactiveOk", tKey: "item_interactive" },
  { key: "classroomMgmt", tKey: "item_classroom" },
];

export function ReadinessForm({ initial }: { initial: State }) {
  const t = useTranslations("Readiness");
  const [state, setState] = useState<State>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(key: keyof Omit<State, "selfRating">) {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function submit() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/teacher/readiness", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    setSaving(false);
    if (res.ok) setMsg(t("savedOk"));
    else setMsg(t("savedFail"));
  }

  return (
    <div className="space-y-5 rounded-xl border border-hajr-border bg-white p-6 shadow-sm">
      <ul className="space-y-3">
        {ITEMS.map((item) => (
          <li key={item.key}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-hajr-border bg-hajr-ivory/40 p-3 hover:bg-hajr-ivory">
              <input
                type="checkbox"
                checked={state[item.key]}
                onChange={() => toggle(item.key)}
                className="mt-1 h-5 w-5 rounded border-hajr-border accent-hajr-rose"
              />
              <span className="text-sm text-hajr-text">{t(item.tKey)}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="border-t border-hajr-border pt-5">
        <p className="mb-2 text-sm font-medium text-hajr-text">{t("selfRating")}</p>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setState((prev) => ({ ...prev, selfRating: n }))}
              className={`h-11 w-11 rounded-full border text-base font-semibold transition ${
                state.selfRating === n
                  ? "border-hajr-rose bg-hajr-rose text-white"
                  : "border-hajr-border bg-white text-hajr-text hover:bg-hajr-ivory"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {msg && <p className="text-sm text-emerald-700">{msg}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="inline-flex h-11 min-w-[140px] items-center justify-center rounded-lg bg-hajr-rose px-5 text-sm font-medium text-white shadow-sm transition hover:bg-hajr-rose/90 disabled:opacity-60"
        >
          {saving ? t("saving") : t("submit")}
        </button>
      </div>
    </div>
  );
}
