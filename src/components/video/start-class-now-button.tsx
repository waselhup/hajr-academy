"use client";

/**
 * "Start Class Now" — opens a class room on demand, with NO scheduled session.
 *
 * Shown on a teacher's class card when there's no upcoming session, so a teacher
 * can open the room any time (to prepare, or run an ad-hoc session and share the
 * join link themselves). Mirrors the teacher-start path of SessionJoinButton:
 *   - reserves the popup SYNCHRONOUSLY inside the click (browsers block
 *     window.open after an await),
 *   - applies the SAME mandatory tech-check grace gate (60-min window),
 *   - then calls startClassNow(classId) which creates/opens the live session.
 *
 * It is class-id based (not session-id based) — the server creates the session.
 */
import { useState, useTransition, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TechCheckDialog } from "@/components/teacher/tech-check-dialog";
import { startClassNow, reservePopup } from "@/lib/zoom/launcher";

/** Mirrors TECH_CHECK_CLASS_ENTRY_MINUTES / the SessionJoinButton grace. */
const TECH_CHECK_GRACE_MINUTES = 60;

type LastSummary = Awaited<
  ReturnType<typeof import("@/lib/teacher/tech-check-gate").getLastTechCheckSummary>
>;

export function StartClassNowButton({
  classId,
  className,
}: {
  classId: string;
  className?: string;
}) {
  const tCls = useTranslations("Classroom");
  const [isPending, startTransition] = useTransition();

  // Resolve the teacher's latest passing tech-check on mount so the click can
  // decide SYNCHRONOUSLY whether to launch or pop the mandatory wizard.
  const [graceOk, setGraceOk] = useState<boolean | null>(null);
  const [lastSummary, setLastSummary] = useState<LastSummary>(null);
  const [gateOpen, setGateOpen] = useState(false);

  const refreshGrace = useCallback(async () => {
    try {
      const res = await fetch("/api/tech-check/last-valid", { cache: "no-store" });
      const data = await res.json();
      const last = data?.last ?? null;
      setLastSummary(last);
      setGraceOk(!!last && last.passed && last.ageMinutes < TECH_CHECK_GRACE_MINUTES);
    } catch {
      // Fail OPEN so a flaky check never blocks a teacher — the server-side
      // gate remains the backstop.
      setGraceOk(true);
    }
  }, []);

  useEffect(() => {
    void refreshGrace();
  }, [refreshGrace]);

  const doLaunch = () => {
    // Reserve the popup synchronously inside the gesture.
    const popup = reservePopup();
    const popupFallback = {
      label: tCls("popupBlocked"),
      action: tCls("joinClass"),
    };
    startTransition(async () => {
      try {
        await startClassNow(classId, popup, popupFallback);
        toast.success(tCls("classStarted"));
      } catch (e: any) {
        toast.error(e?.message ?? tCls("classError"));
      }
    });
  };

  const handleClick = () => {
    // No valid tech-check in the last hour → mandatory wizard, same as the
    // scheduled teacher start.
    if (graceOk === false) {
      setGateOpen(true);
      return;
    }
    doLaunch();
  };

  const handleGatePassed = () => {
    setGraceOk(true);
    setGateOpen(false);
    doLaunch();
  };

  // Wait for the grace status to resolve before enabling (closes the sub-second
  // race where a click lands before the fetch returns).
  const enabled = graceOk !== null && !isPending;

  return (
    <div className={className}>
      <Button variant="cta" size="sm" className="w-full" disabled={!enabled} onClick={handleClick}>
        {isPending ? (
          <Loader2 className="me-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="me-2 h-4 w-4" />
        )}
        {tCls("startClassNow")}
      </Button>

      <TechCheckDialog
        open={gateOpen}
        onOpenChange={setGateOpen}
        lastSummary={lastSummary}
        mandatory
        onPassed={handleGatePassed}
        passActionLabel={tCls("startClassNow")}
      />
    </div>
  );
}
