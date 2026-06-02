"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TechCheckDialog } from "./tech-check-dialog";
import type { TechCheckCardState } from "@/lib/teacher/tech-check-gate";

type LastSummary = Awaited<
  ReturnType<typeof import("@/lib/teacher/tech-check-gate").getLastTechCheckSummary>
>;

/**
 * Proactive tech-check card on the teacher Overview. Three states:
 *   - none    → "Run tech-check"
 *   - valid   → "Passed — valid for the next N min ✓"
 *   - expired → "Expired — run again"
 *
 * Running it here is purely optional: a pass frees the next hour so the
 * teacher can enter any class without the mandatory class-entry popup.
 * No blocking happens on the dashboard.
 */
export function TechCheckCardClient({
  state,
  minutesLeft,
  lastSummary,
}: {
  state: TechCheckCardState;
  minutesLeft: number;
  lastSummary: LastSummary;
}) {
  const t = useTranslations("TechCheck");
  const [open, setOpen] = useState(false);

  const tone =
    state === "valid"
      ? { ring: "border-hajr-mint/40 bg-hajr-mint/10", icon: <ShieldCheck className="h-5 w-5 text-hajr-mint" />, accent: "text-hajr-mint" }
      : state === "expired"
      ? { ring: "border-amber-300 bg-amber-50", icon: <ShieldAlert className="h-5 w-5 text-amber-500" />, accent: "text-amber-600" }
      : { ring: "border-hajr-rose/40 bg-hajr-rose/10", icon: <ShieldQuestion className="h-5 w-5 text-hajr-rose" />, accent: "text-hajr-rose" };

  const title =
    state === "valid" ? t("cardValidTitle", { minutes: minutesLeft }) : state === "expired" ? t("cardExpiredTitle") : t("cardNoneTitle");
  const body =
    state === "valid" ? t("cardValidBody") : state === "expired" ? t("cardExpiredBody") : t("cardNoneBody");
  const cta = state === "valid" ? t("runAgain") : state === "expired" ? t("runAgain") : t("runNow");

  return (
    <>
      <Card className={tone.ring}>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 shrink-0">{tone.icon}</span>
            <div className="min-w-0">
              <div className={`text-sm font-semibold ${tone.accent}`}>{title}</div>
              <div className="text-xs text-hajr-gray-600">{body}</div>
            </div>
          </div>
          <Button
            size="sm"
            variant={state === "valid" ? "outline" : "cta"}
            onClick={() => setOpen(true)}
            data-testid="techcheck-card-cta"
          >
            {cta}
          </Button>
        </CardContent>
      </Card>

      <TechCheckDialog open={open} onOpenChange={setOpen} lastSummary={lastSummary} />
    </>
  );
}
