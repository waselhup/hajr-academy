"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Video, Eye, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TechCheckDialog } from "@/components/teacher/tech-check-dialog";
import {
  startClassAsTeacher,
  joinClassAsParticipant,
  reservePopup,
  closePopup,
} from "@/lib/zoom/launcher";

/** Teacher class-entry grace window, mirrors TECH_CHECK_CLASS_ENTRY_MINUTES. */
const TECH_CHECK_GRACE_MINUTES = 60;

type LastSummary = Awaited<
  ReturnType<typeof import("@/lib/teacher/tech-check-gate").getLastTechCheckSummary>
>;

type Mode = "start" | "join" | "observe";

interface Props {
  /** ClassSession id or PrivateLesson id. */
  sessionId: string;
  kind: "classSession" | "privateLesson";
  mode: Mode;
  /** ISO date string of the scheduled start. */
  scheduledDate: string;
  durationMinutes: number;
  status: string;
  /** Already has a Zoom meeting created. */
  hasMeeting: boolean;
  className?: string;
}

const BEFORE_START = 15 * 60_000;
const BEFORE_JOIN = 15 * 60_000;
const AFTER = 30 * 60_000;

export function SessionJoinButton({
  sessionId,
  kind,
  mode,
  scheduledDate,
  durationMinutes,
  status,
  hasMeeting,
  className,
}: Props) {
  const t = useTranslations("Video");
  const tCls = useTranslations("Classroom");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  // Tech-check class-entry gate (teacher "Start Class" only). We resolve the
  // teacher's latest passing check on mount so the click handler can decide
  // SYNCHRONOUSLY whether to launch Zoom or pop the mandatory wizard — an
  // await before reservePopup() would get the popup blocked.
  const teacherStartsClass = mode === "start" && kind === "classSession";
  const [graceOk, setGraceOk] = useState<boolean | null>(teacherStartsClass ? null : true);
  const [lastSummary, setLastSummary] = useState<LastSummary>(null);
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const refreshGrace = useCallback(async () => {
    if (!teacherStartsClass) return;
    try {
      const res = await fetch("/api/tech-check/last-valid", { cache: "no-store" });
      const data = await res.json();
      const last = data?.last ?? null;
      setLastSummary(last);
      setGraceOk(!!last && last.passed && last.ageMinutes < TECH_CHECK_GRACE_MINUTES);
    } catch {
      // If we can't determine it, fail OPEN so a flaky check never blocks a
      // teacher's class. The server-side classroom gate remains the backstop.
      setGraceOk(true);
    }
  }, [teacherStartsClass]);

  useEffect(() => {
    void refreshGrace();
  }, [refreshGrace]);

  const start = new Date(scheduledDate).getTime();
  const end = start + durationMinutes * 60_000;
  const ended = status === "COMPLETED" || status === "CANCELLED";
  const isLive = status === "LIVE";

  // Teacher start: always available, no window. Student/admin join:
  // the timed window OR the session is LIVE. (teacherStartsClass declared above
  // for the tech-check gate.)
  let open: boolean;
  if (teacherStartsClass) {
    open = true;
  } else if (isLive) {
    open = true;
  } else {
    const lead = mode === "start" ? BEFORE_START : BEFORE_JOIN;
    open = now >= start - lead && now <= end + AFTER;
  }
  // For a teacher start, wait until the tech-check grace status is resolved
  // before enabling the button. This closes the sub-second race where a click
  // landing before the grace fetch returns could launch without the gate.
  const graceResolved = !teacherStartsClass || graceOk !== null;
  const enabled = open && !ended && !isPending && graceResolved;

  const baseLabel =
    mode === "start"
      ? tCls("startClass")
      : mode === "observe"
      ? t("observeClass")
      : tCls("joinClass");
  const label = isPending
    ? mode === "start"
      ? tCls("startingClass")
      : tCls("joiningClass")
    : baseLabel;

  // The actual launch. Must run from inside a real user gesture so the
  // synchronous reservePopup() isn't blocked. Called either directly from the
  // click (when the tech-check grace window is valid) or from the wizard's
  // "Continue to class" button after a fresh pass.
  const doLaunch = () => {
    // CRITICAL: reserve the popup SYNCHRONOUSLY inside the click handler.
    // Browsers block window.open that runs after an await, treating it
    // as non-user-initiated. This is the only path that reliably opens
    // a new tab from an async flow.
    const needsPopup =
      kind === "classSession" &&
      (mode === "start" || mode === "join" || mode === "observe");
    const popup = needsPopup ? reservePopup() : null;
    const popupFallback = {
      label: tCls("popupBlocked"),
      action: tCls("joinClass"),
    };

    startTransition(async () => {
      try {
        if (mode === "start" && kind === "classSession") {
          await startClassAsTeacher(sessionId, popup, popupFallback);
          toast.success(tCls("classStarted"));
          return;
        }
        if (mode === "join" && kind === "classSession") {
          try {
            await joinClassAsParticipant(sessionId, popup, popupFallback);
            toast.message(tCls("joiningClass"));
          } catch (err: any) {
            if (err.status === 409) {
              toast.error(tCls("classNotStartedNotify"));
              return;
            }
            throw err;
          }
          return;
        }
        if (mode === "observe" && kind === "classSession") {
          await joinClassAsParticipant(sessionId, popup, popupFallback);
          return;
        }
        // Private lesson — close the unused popup, use original flow.
        if (kind === "privateLesson") {
          closePopup(popup);
          if (mode === "start" || !hasMeeting) {
            const res = await fetch("/api/zoom/create-meeting", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ privateLessonId: sessionId }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
              toast.error(data.error ?? tCls("classError"));
              return;
            }
          }
          router.push(`/${locale}/classroom/${sessionId}`);
        }
      } catch (e: any) {
        closePopup(popup);
        toast.error(e?.message ?? tCls("classError"));
      }
    });
  };

  const handleClick = () => {
    // Teacher starting a class without a valid tech-check in the last hour →
    // pop the MANDATORY wizard instead of launching. Students/parents (join /
    // observe) and teachers within the grace window are never interrupted.
    if (teacherStartsClass && graceOk === false) {
      setGateOpen(true);
      return;
    }
    doLaunch();
  };

  // After the teacher passes inside the mandatory modal, close it and launch
  // the class. This runs inside the wizard button's click → a real gesture, so
  // the synchronous popup reservation in doLaunch() still works.
  const handleGatePassed = () => {
    setGraceOk(true);
    setGateOpen(false);
    doLaunch();
  };

  let hint = "";
  if (!teacherStartsClass && !ended && !open && now < start) {
    const diff = start - now;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    hint = `${tCls("startsInMinutes", { minutes: h > 0 ? `${h}h ${m}` : m })}`;
  }

  return (
    <div className={className}>
      <Button
        variant="cta"
        size="sm"
        disabled={!enabled}
        onClick={handleClick}
        title={
          !enabled && !ended && graceResolved
            ? mode === "start"
              ? tCls("classTooEarly")
              : tCls("classNotStarted")
            : ""
        }
      >
        {isPending ? (
          <Loader2 className="me-2 h-4 w-4 animate-spin" />
        ) : mode === "observe" ? (
          <Eye className="me-2 h-4 w-4" />
        ) : mode === "start" ? (
          <Sparkles className="me-2 h-4 w-4" />
        ) : (
          <Video className="me-2 h-4 w-4" />
        )}
        {label}
      </Button>
      {hint && <p className="mt-1 text-xs text-muted-foreground num">{hint}</p>}

      {teacherStartsClass && (
        <TechCheckDialog
          open={gateOpen}
          onOpenChange={setGateOpen}
          lastSummary={lastSummary}
          mandatory
          onPassed={handleGatePassed}
          passActionLabel={tCls("startClass")}
        />
      )}
    </div>
  );
}
