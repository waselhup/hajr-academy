"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { KNOWN_TOOLS as TOOLS } from "@/lib/teacher/readiness-tools";

interface State {
  zoomTested: boolean;
  digitalToolsOk: boolean;
  mockClassDone: boolean;
  interactiveTools: string[];
  interactiveToolsOther: string;
  classroomMgmt: boolean;
  selfRating: number | null;
}

// The plain boolean checklist items (the interactive-tools item is special).
const ITEMS: { key: "zoomTested" | "digitalToolsOk" | "mockClassDone" | "classroomMgmt"; tKey: string }[] = [
  { key: "zoomTested", tKey: "item_zoom" },
  { key: "digitalToolsOk", tKey: "item_digital" },
  { key: "mockClassDone", tKey: "item_mock" },
  { key: "classroomMgmt", tKey: "item_classroom" },
];

export function ReadinessForm({ initial }: { initial: State }) {
  const t = useTranslations("Readiness");
  const [state, setState] = useState<State>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(key: "zoomTested" | "digitalToolsOk" | "mockClassDone" | "classroomMgmt") {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleTool(tool: string) {
    setState((prev) => ({
      ...prev,
      interactiveTools: prev.interactiveTools.includes(tool)
        ? prev.interactiveTools.filter((x) => x !== tool)
        : [...prev.interactiveTools, tool],
    }));
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

      {/* F4 — specific interactive tools (multi-select + other). */}
      <div className="rounded-lg border border-hajr-border bg-hajr-ivory/40 p-4">
        <p className="text-sm font-medium text-hajr-text">{t("toolsLabel")}</p>
        <p className="mt-0.5 text-xs text-hajr-muted">{t("toolsHint")}</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <label
              key={tool}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-hajr-border bg-white p-2.5 hover:bg-hajr-ivory"
            >
              <input
                type="checkbox"
                checked={state.interactiveTools.includes(tool)}
                onChange={() => toggleTool(tool)}
                className="h-4 w-4 rounded border-hajr-border accent-hajr-rose"
              />
              <span className="text-sm text-hajr-text">{t(`tool_${tool}`)}</span>
            </label>
          ))}
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs text-hajr-muted">{t("toolsOther")}</label>
          <input
            type="text"
            value={state.interactiveToolsOther}
            onChange={(e) => setState((prev) => ({ ...prev, interactiveToolsOther: e.target.value }))}
            placeholder={t("toolsOtherPlaceholder")}
            className="h-11 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm text-hajr-text focus:border-hajr-rose focus:outline-none"
          />
        </div>
      </div>

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
