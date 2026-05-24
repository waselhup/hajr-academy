"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Video, Eye, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  startClassAsTeacher,
  joinClassAsParticipant,
  openZoomMeeting,
} from "@/lib/zoom/launcher";

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

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const start = new Date(scheduledDate).getTime();
  const end = start + durationMinutes * 60_000;
  const ended = status === "COMPLETED" || status === "CANCELLED";
  const isLive = status === "LIVE";

  // Teacher start: always available, no window. Student/admin join:
  // the timed window OR the session is LIVE.
  const teacherStartsClass = mode === "start" && kind === "classSession";
  let open: boolean;
  if (teacherStartsClass) {
    open = true;
  } else if (isLive) {
    open = true;
  } else {
    const lead = mode === "start" ? BEFORE_START : BEFORE_JOIN;
    open = now >= start - lead && now <= end + AFTER;
  }
  const enabled = open && !ended && !isPending;

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

  const handleClick = () => {
    startTransition(async () => {
      try {
        if (mode === "start" && kind === "classSession") {
          // Teacher start: backend ensures meeting + LIVE + broadcast,
          // returns zoomStartUrl; launcher opens Zoom in a new tab.
          await startClassAsTeacher(sessionId);
          toast.success(tCls("classStarted"));
          return;
        }
        if (mode === "join" && kind === "classSession") {
          try {
            await joinClassAsParticipant(sessionId);
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
        // Observe (admin) → same join route works.
        if (mode === "observe" && kind === "classSession") {
          await joinClassAsParticipant(sessionId);
          return;
        }
        // Private lesson — original flow stays. Ensure meeting exists,
        // then open the join URL directly.
        if (kind === "privateLesson") {
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
          // Fall back to the SDK route for private lessons until they
          // get the same launcher treatment.
          router.push(`/${locale}/classroom/${sessionId}`);
        }
      } catch (e: any) {
        toast.error(e?.message ?? tCls("classError"));
      }
    });
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
          !enabled && !ended
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
    </div>
  );
}
