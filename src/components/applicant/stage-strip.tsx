import { Check } from "lucide-react";
import type { ApplicantStage } from "@prisma/client";
import { cn } from "@/lib/utils";

/** The visible journey (DECISION is folded into the final "Decision" node). */
const STRIP_STAGES: ApplicantStage[] = ["NEW", "INTERVIEW", "TESTING", "DEMO", "DECISION"];

const STAGE_LABEL_KEY: Record<ApplicantStage, string> = {
  NEW: "Applicant.stageReceived",
  MESSAGING: "Applicant.stageReceived",
  INTERVIEW: "Applicant.stageInterview",
  TESTING: "Applicant.stageTest",
  DEMO: "Applicant.stageDemo",
  DECISION: "Applicant.stageDecision",
};

/**
 * Warm progress strip on the Overview: "Application received → Interview →
 * Test → Demo → Decision". Pure presentational; labels resolved by the caller
 * (a server component) so this stays a server component too.
 */
export function StageStrip({
  current,
  labels,
}: {
  current: ApplicantStage;
  labels: Record<string, string>;
}) {
  // MESSAGING maps onto the first node alongside NEW.
  const normalized: ApplicantStage = current === "MESSAGING" ? "NEW" : current;
  const currentIdx = STRIP_STAGES.indexOf(normalized);

  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1" dir="ltr">
      {STRIP_STAGES.map((stage, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const labelKey = STAGE_LABEL_KEY[stage];
        return (
          <li key={stage} className="flex min-w-0 flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                  done && "border-hajr-mint bg-hajr-mint text-white",
                  active && "border-hajr-rose bg-hajr-rose text-white",
                  !done && !active && "border-hajr-gray-200 bg-white text-hajr-gray-400"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "max-w-[5.5rem] text-center text-[0.65rem] leading-tight",
                  active ? "font-semibold text-hajr-deep-navy" : "text-hajr-muted"
                )}
              >
                {labels[labelKey] ?? labelKey}
              </span>
            </div>
            {i < STRIP_STAGES.length - 1 && (
              <span
                className={cn(
                  "mx-1 h-0.5 flex-1 rounded-full",
                  i < currentIdx ? "bg-hajr-mint" : "bg-hajr-gray-200"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
