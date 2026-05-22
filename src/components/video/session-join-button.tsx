"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Video, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Prefetch the classroom route so the navigation after "Start"/"Join"
  // is instant — the only remaining wait is the Zoom meeting setup.
  useEffect(() => {
    router.prefetch(`/${locale}/classroom/${sessionId}`);
  }, [router, locale, sessionId]);

  const start = new Date(scheduledDate).getTime();
  const end = start + durationMinutes * 60_000;
  const ended = status === "COMPLETED" || status === "CANCELLED";
  const isLive = status === "LIVE";

  // A teacher (or admin) may start their class session at ANY time —
  // there is no early window. Private lessons and the student/parent
  // join still use the timed window.
  const teacherStartsClass = mode === "start" && kind === "classSession";
  let open: boolean;
  if (teacherStartsClass) {
    open = true; // anytime, unless ended (handled by `ended` below)
  } else if (isLive) {
    // A LIVE session is joinable for as long as it stays LIVE — the
    // teacher may run long past the scheduled slot. The only thing that
    // closes it is the session ending (COMPLETED/CANCELLED).
    open = true;
  } else {
    const lead = mode === "start" ? BEFORE_START : BEFORE_JOIN;
    open = now >= start - lead && now <= end + AFTER;
  }
  const enabled = open && !ended && !isPending;

  const baseLabel =
    mode === "start" ? t("startClass") : mode === "observe" ? t("observeClass") : t("joinClass");
  // While the request is in flight, show a clear progress label rather
  // than a frozen button — so the teacher knows the class is starting.
  const label = isPending
    ? mode === "start"
      ? t("starting")
      : t("joining")
    : baseLabel;

  const handleClick = () => {
    startTransition(async () => {
      try {
        if (mode === "start") {
          if (kind === "classSession") {
            // Starting a class: this route creates the Zoom meeting,
            // flips the session LIVE, broadcasts `class_started` on the
            // class Realtime channel, and notifies enrolled students +
            // their parents. Idempotent — safe to re-click.
            const res = await fetch(
              `/api/class-sessions/${sessionId}/start`,
              { method: "POST" }
            );
            const data = await res.json();
            if (!res.ok || !data.ok) {
              toast.error(data.error ?? "Could not start the class");
              return;
            }
          } else if (!hasMeeting) {
            // Private lesson: no class roster to broadcast to — just
            // ensure the Zoom meeting exists.
            const res = await fetch("/api/zoom/create-meeting", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ privateLessonId: sessionId }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
              toast.error(data.error ?? "ZOOM_ERROR");
              return;
            }
          }
        }
        // join / observe with a meeting already created → no API round
        // trip; navigate straight into the (prefetched) classroom.
        router.push(`/${locale}/classroom/${sessionId}`);
      } catch {
        toast.error(t("starting"));
      }
    });
  };

  // Countdown text when the session has not opened yet. The teacher's
  // "start" button has no window, so no countdown is shown there.
  let hint = "";
  if (!teacherStartsClass && !ended && !open && now < start) {
    const diff = start - now;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    hint = `${t("startsIn")} ${h > 0 ? `${h}h ` : ""}${m}m`;
  }

  return (
    <div className={className}>
      <Button
        variant="cta"
        size="sm"
        disabled={!enabled}
        onClick={handleClick}
        title={!enabled && !ended ? (mode === "start" ? t("startWindowHint") : t("joinWindowHint")) : ""}
      >
        {isPending ? (
          <Loader2 className="me-2 h-4 w-4 animate-spin" />
        ) : mode === "observe" ? (
          <Eye className="me-2 h-4 w-4" />
        ) : (
          <Video className="me-2 h-4 w-4" />
        )}
        {label}
      </Button>
      {hint && <p className="mt-1 text-xs text-muted-foreground num">{hint}</p>}
    </div>
  );
}
