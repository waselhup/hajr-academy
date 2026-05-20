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

  const start = new Date(scheduledDate).getTime();
  const end = start + durationMinutes * 60_000;
  const lead = mode === "start" ? BEFORE_START : BEFORE_JOIN;
  const open = now >= start - lead && now <= end + AFTER;
  const ended = status === "COMPLETED" || status === "CANCELLED";
  const enabled = open && !ended && !isPending;

  const label =
    mode === "start" ? t("startClass") : mode === "observe" ? t("observeClass") : t("joinClass");

  const handleClick = () => {
    startTransition(async () => {
      try {
        if (mode === "start" && !hasMeeting) {
          const res = await fetch("/api/zoom/create-meeting", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              kind === "classSession"
                ? { classSessionId: sessionId }
                : { privateLessonId: sessionId }
            ),
          });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            toast.error(data.error ?? "ZOOM_ERROR");
            return;
          }
        }
        router.push(`/${locale}/classroom/${sessionId}`);
      } catch {
        toast.error(t("starting"));
      }
    });
  };

  // Countdown text when not yet open.
  let hint = "";
  if (!ended && now < start - lead) {
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
