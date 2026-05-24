"use client";

/**
 * LiveClassBanner — global "your class is live now" notice. When a
 * teacher starts a class, the server fan-out hits the viewer's per-user
 * channel and a deep-navy banner with a rose CTA appears within ~1s.
 *
 * Mount once per page (student dashboard, /student/classes, /admin/live).
 * Tapping CTA fires joinClassAsParticipant — opens Zoom in a new tab.
 *
 * Backward-compat: if `userId` is omitted but `classIds` are given,
 * we subscribe to the legacy per-class channel as a fallback so older
 * callers keep working without breaking changes.
 */
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Radio, X } from "lucide-react";
import { useLiveClassWatcher, type LiveClassNotice } from "./use-live-class-watcher";
import { joinClassAsParticipant, reservePopup } from "@/lib/zoom/launcher";
import { classChannel } from "@/lib/class/realtime";

interface Props {
  /** Preferred: subscribe to the viewer's per-user live channel. */
  userId?: string | null;
  /** Legacy fallback: subscribe per-class. Ignored when userId is set. */
  classIds?: string[];
}

export function LiveClassBanner({ userId, classIds }: Props) {
  const t = useTranslations("Classroom");
  const locale = useLocale();
  const ar = locale === "ar";

  // Preferred path — per-user channel.
  const { live: liveFromUser, dismiss: dismissFromUser } = useLiveClassWatcher(
    userId ?? null
  );

  // Legacy fallback — per-class channels. Only runs when no userId.
  const [liveFromClasses, setLiveFromClasses] = useState<LiveClassNotice[]>([]);
  useEffect(() => {
    if (userId || !classIds || classIds.length === 0) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key);
    const channels: RealtimeChannel[] = [];
    for (const classId of classIds) {
      const ch = supabase.channel(classChannel(classId));
      ch.on("broadcast", { event: "class_started" }, ({ payload }) => {
        const p = payload as {
          classId: string;
          sessionId: string;
          className: string;
        };
        setLiveFromClasses((prev) =>
          prev.some((s) => s.sessionId === p.sessionId)
            ? prev
            : [
                ...prev,
                {
                  classId: p.classId,
                  sessionId: p.sessionId,
                  className: p.className,
                  teacherName: "",
                  startedAt: new Date().toISOString(),
                },
              ]
        );
      });
      ch.on("broadcast", { event: "class_ended" }, ({ payload }) => {
        const p = payload as { sessionId: string };
        setLiveFromClasses((prev) => prev.filter((s) => s.sessionId !== p.sessionId));
      });
      ch.subscribe();
      channels.push(ch);
    }
    return () => {
      for (const ch of channels) supabase.removeChannel(ch);
    };
  }, [userId, classIds]);

  // Merge sources, de-dup by sessionId.
  const seen = new Set<string>();
  const live = [...liveFromUser, ...liveFromClasses].filter((n) => {
    if (seen.has(n.sessionId)) return false;
    seen.add(n.sessionId);
    return true;
  });

  if (live.length === 0) return null;

  const handleJoin = async (notice: LiveClassNotice) => {
    // Reserve popup synchronously inside the click handler so browsers
    // recognise it as a user gesture.
    const popup = reservePopup();
    try {
      await joinClassAsParticipant(notice.sessionId, popup, {
        label: t("popupBlocked"),
        action: t("joinClass"),
      });
      toast.message(t("joiningClass"));
    } catch (e: any) {
      if (e?.status === 409) {
        toast.error(t("classNotStartedNotify"));
        return;
      }
      toast.error(e?.message ?? t("classError"));
    }
  };

  return (
    <div className="space-y-2">
      {live.map((s) => (
        <div
          key={s.sessionId}
          className="relative flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-navy px-4 py-3 text-white shadow-md sm:px-5 sm:py-4"
        >
          <button
            aria-label={t("liveNowDismiss")}
            onClick={() => dismissFromUser(s.sessionId)}
            className="absolute end-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex min-w-0 items-center gap-3 pe-7">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hajr-mint opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-hajr-mint" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-hajr-mint">
                ● {t("liveBadge")}
              </p>
              <p className="mt-0.5 truncate font-bold">
                {s.teacherName
                  ? t("liveNowBanner", {
                      className: s.className,
                      teacherName: s.teacherName,
                    })
                  : s.className}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleJoin(s)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-hajr-deep-navy px-4 py-2 text-sm font-semibold transition-colors hover:bg-hajr-deep-navy/90"
          >
            <Radio className="h-4 w-4" />
            {t("joinClass")}
          </button>
        </div>
      ))}
    </div>
  );
}
