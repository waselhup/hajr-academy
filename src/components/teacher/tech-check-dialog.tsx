"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TechCheckWizard } from "@/app/[locale]/(app)/teacher/tech-check/_components/tech-check-wizard";

type LastSummary = Awaited<
  ReturnType<typeof import("@/lib/teacher/tech-check-gate").getLastTechCheckSummary>
>;

/**
 * Reusable modal that runs the SAME tech-check wizard inline. Used by both:
 *   - the dashboard card (proactive — dismissible, on pass just closes), and
 *   - the class-entry gate (mandatory — not dismissible until passed).
 *
 * It deliberately does NOT duplicate any wizard logic; it only mounts
 * <TechCheckWizard/> inside a Dialog and forwards an onPassed callback.
 */
export function TechCheckDialog({
  open,
  onOpenChange,
  lastSummary,
  mandatory = false,
  onPassed,
  passActionLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lastSummary: LastSummary;
  /** Mandatory mode blocks overlay/Esc dismissal and hides the close button. */
  mandatory?: boolean;
  /** Called once when the wizard passes. */
  onPassed?: () => void;
  passActionLabel?: string;
}) {
  const t = useTranslations("TechCheck");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!mandatory || o) onOpenChange(o); }}>
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        // In mandatory mode, block dismissal by overlay click / Esc / focus loss.
        onPointerDownOutside={mandatory ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={mandatory ? (e) => e.preventDefault() : undefined}
        onInteractOutside={mandatory ? (e) => e.preventDefault() : undefined}
        hideClose={mandatory}
      >
        <DialogHeader>
          <DialogTitle>{mandatory ? t("gateTitle") : t("title")}</DialogTitle>
          <DialogDescription>
            {mandatory ? t("gateBody") : t("subtitle")}
          </DialogDescription>
        </DialogHeader>
        <TechCheckWizard
          returnTo={null}
          lastSummary={lastSummary}
          onPassed={onPassed}
          passActionLabel={passActionLabel}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Lightweight controlled-open hook helper so callers don't repeat useState.
 */
export function useTechCheckDialog(initial = false) {
  const [open, setOpen] = useState(initial);
  return { open, setOpen };
}
