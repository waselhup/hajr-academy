"use client";

/**
 * Owner batch 5, item #5 — Teacher onboarding questionnaire (client).
 *
 * A clean, required, MULTI-STEP form covering the TeacherReadiness question
 * set. Next/Back navigation with a Western-digit "Step X / N" indicator.
 * Each step gates Next until its requirement is met; the final step POSTs to
 * /api/teacher/onboarding, then leaves the gate via router.replace("/teacher").
 *
 * Numbers are always Western (0-9) per the platform rule — selfRating buttons
 * render literal 1..5 and the progress label uses the locale-agnostic
 * `stepOf` ICU message with numeric args (next-intl renders digits Western
 * when the doc/locale number system is latn, which the app enforces).
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
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

type BoolKey = "zoomTested" | "digitalToolsOk" | "mockClassDone" | "classroomMgmt";

// Step descriptors. Each "confirm" step toggles one boolean; the tools and
// rating steps are special-cased in the renderer.
type Step =
  | { kind: "confirm"; key: BoolKey; titleKey: string; labelKey: string }
  | { kind: "tools"; titleKey: string }
  | { kind: "rating"; titleKey: string };

const STEPS: Step[] = [
  { kind: "confirm", key: "zoomTested", titleKey: "stepZoomTitle", labelKey: "confirmZoom" },
  { kind: "confirm", key: "digitalToolsOk", titleKey: "stepDigitalTitle", labelKey: "confirmDigital" },
  { kind: "confirm", key: "mockClassDone", titleKey: "stepMockTitle", labelKey: "confirmMock" },
  { kind: "tools", titleKey: "stepToolsTitle" },
  { kind: "confirm", key: "classroomMgmt", titleKey: "stepClassroomTitle", labelKey: "confirmClassroom" },
  { kind: "rating", titleKey: "stepRatingTitle" },
];

export function OnboardingClient({ initial }: { initial: State }) {
  const t = useTranslations("TeacherOnboarding");
  const tReadiness = useTranslations("Readiness");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const [state, setState] = useState<State>(initial);
  const [stepIdx, setStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = STEPS.length;
  const step = STEPS[stepIdx];
  const isLast = stepIdx === total - 1;

  function toggleTool(tool: string) {
    setState((prev) => ({
      ...prev,
      interactiveTools: prev.interactiveTools.includes(tool)
        ? prev.interactiveTools.filter((x) => x !== tool)
        : [...prev.interactiveTools, tool],
    }));
  }

  // Whether the current step's requirement is satisfied.
  function stepValid(): boolean {
    if (step.kind === "confirm") return state[step.key] === true;
    if (step.kind === "tools")
      return state.interactiveTools.length > 0 || state.interactiveToolsOther.trim().length > 0;
    if (step.kind === "rating") return state.selfRating != null;
    return false;
  }

  // The validation message to show when the current step is incomplete.
  function stepError(): string {
    if (step.kind === "tools") return t("errorToolsRequired");
    if (step.kind === "rating") return t("errorRatingRequired");
    return t("errorConfirmRequired");
  }

  function back() {
    setError(null);
    setStepIdx((i) => Math.max(0, i - 1));
  }

  async function next() {
    if (!stepValid()) {
      setError(stepError());
      return;
    }
    setError(null);
    if (!isLast) {
      setStepIdx((i) => i + 1);
      return;
    }
    await submit();
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zoomTested: state.zoomTested,
          digitalToolsOk: state.digitalToolsOk,
          mockClassDone: state.mockClassDone,
          classroomMgmt: state.classroomMgmt,
          interactiveTools: state.interactiveTools,
          interactiveToolsOther: state.interactiveToolsOther,
          selfRating: state.selfRating,
        }),
      });
      if (!res.ok) {
        setSubmitting(false);
        setError(t("errorSubmit"));
        return;
      }
      // Leave the onboarding gate. replace() (not push) so Back doesn't return
      // here; refresh() re-runs the server layout/page with the new state.
      router.replace("/teacher");
      router.refresh();
    } catch {
      setSubmitting(false);
      setError(t("errorSubmit"));
    }
  }

  const pct = Math.round(((stepIdx + 1) / total) * 100);

  return (
    <div className="space-y-5 rounded-xl border border-hajr-border bg-white p-6 shadow-sm">
      {/* Progress — Western-digit "Step X / N" + bar. */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          {/* Pass digits as strings (not numbers) so next-intl does raw
              substitution and never applies a locale number system — keeps
              "Step X / N" in Western digits even on the Arabic locale. */}
          <span className="num font-medium text-hajr-text">
            {t("stepOf", { current: String(stepIdx + 1), total: String(total) })}
          </span>
          <span className="num text-xs text-hajr-muted">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-hajr-ivory">
          <div className="h-full bg-hajr-rose transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-hajr-text">{t(step.titleKey)}</h2>
        {stepIdx === 0 && <p className="mt-1 text-sm text-hajr-muted">{t("intro")}</p>}
      </div>

      {/* Step body. */}
      <div className="min-h-[120px]">
        {step.kind === "confirm" && (
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-hajr-border bg-hajr-ivory/40 p-4 hover:bg-hajr-ivory">
            <input
              type="checkbox"
              checked={state[step.key]}
              onChange={() =>
                setState((prev) => ({ ...prev, [step.key]: !prev[step.key as BoolKey] }))
              }
              className="mt-0.5 h-5 w-5 rounded border-hajr-border accent-hajr-rose"
            />
            <span className="text-sm text-hajr-text">{t(step.labelKey)}</span>
          </label>
        )}

        {step.kind === "tools" && (
          <div>
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
                  <span className="text-sm text-hajr-text">{tReadiness(`tool_${tool}`)}</span>
                </label>
              ))}
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs text-hajr-muted">{tReadiness("toolsOther")}</label>
              <input
                type="text"
                value={state.interactiveToolsOther}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, interactiveToolsOther: e.target.value }))
                }
                placeholder={tReadiness("toolsOtherPlaceholder")}
                className="h-11 w-full rounded-lg border border-hajr-border bg-white px-3 text-sm text-hajr-text focus:border-hajr-rose focus:outline-none"
              />
            </div>
          </div>
        )}

        {step.kind === "rating" && (
          <div>
            <p className="text-sm font-medium text-hajr-text">{t("ratingLabel")}</p>
            <p className="mt-0.5 text-xs text-hajr-muted">{t("ratingHint")}</p>
            <div className="mt-3 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setState((prev) => ({ ...prev, selfRating: n }))}
                  className={`num h-11 w-11 rounded-full border text-base font-semibold transition ${
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
        )}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex items-center justify-between border-t border-hajr-border pt-5">
        <button
          type="button"
          onClick={back}
          disabled={stepIdx === 0 || submitting}
          className="inline-flex h-11 min-w-[100px] items-center justify-center rounded-lg border border-hajr-border bg-white px-5 text-sm font-medium text-hajr-text transition hover:bg-hajr-ivory disabled:opacity-40"
        >
          {tCommon("back")}
        </button>
        <button
          type="button"
          onClick={next}
          disabled={submitting}
          className="inline-flex h-11 min-w-[140px] items-center justify-center rounded-lg bg-hajr-rose px-5 text-sm font-medium text-white shadow-sm transition hover:bg-hajr-rose/90 disabled:opacity-60"
        >
          {isLast ? (submitting ? t("submitting") : t("finish")) : tCommon("next")}
        </button>
      </div>
    </div>
  );
}
