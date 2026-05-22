"use client";

/**
 * LiveClassBanner — subscribes to the Supabase Realtime `class:{id}`
 * channels for the viewer's enrolled classes. When a teacher starts a
 * class, a `class_started` broadcast arrives and a prominent green
 * "your class is live — join now" banner appears within ~1–2 seconds.
 *
 * Used on the student dashboard. Falls back silently if Realtime is
 * unavailable; the persisted LIVE session + notification still cover it.
 */

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Radio } from "lucide-react";
import { classChannel } from "@/lib/class/realtime";

interface LiveSession {
  classId: string;
  sessionId: string;
  className: string;
}

export function LiveClassBanner({ classIds }: { classIds: string[] }) {
  const locale = useLocale();
  const [live, setLive] = useState<LiveSession[]>([]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key || classIds.length === 0) return;

    const supabase = createClient(url, key);
    const channels: RealtimeChannel[] = [];

    for (const classId of classIds) {
      const channel = supabase.channel(classChannel(classId));
      channel
        .on("broadcast", { event: "class_started" }, ({ payload }) => {
          const p = payload as {
            classId: string;
            sessionId: string;
            className: string;
          };
          setLive((prev) =>
            prev.some((s) => s.sessionId === p.sessionId)
              ? prev
              : [
                  ...prev,
                  {
                    classId: p.classId,
                    sessionId: p.sessionId,
                    className: p.className,
                  },
                ]
          );
          toast.success(
            locale === "ar"
              ? `حصة ${p.className} بدأت الآن!`
              : `${p.className} has started!`
          );
        })
        .on("broadcast", { event: "class_ended" }, ({ payload }) => {
          const p = payload as { sessionId: string };
          setLive((prev) => prev.filter((s) => s.sessionId !== p.sessionId));
        })
        .subscribe();
      channels.push(channel);
    }

    return () => {
      for (const ch of channels) supabase.removeChannel(ch);
    };
  }, [classIds, locale]);

  if (live.length === 0) return null;

  return (
    <div className="space-y-2">
      {live.map((s) => (
        <Link
          key={s.sessionId}
          href={`/${locale}/classroom/${s.sessionId}`}
          className="flex items-center justify-between gap-3 rounded-xl bg-hajr-success px-5 py-4 text-white shadow-md transition-transform hover:scale-[1.01]"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
            </span>
            <div>
              <div className="font-bold">
                {locale === "ar" ? "حصتك بدأت الآن!" : "Your class is live!"}
              </div>
              <div className="text-sm text-white/85">{s.className}</div>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-lg bg-white/20 px-4 py-2 text-sm font-semibold">
            <Radio className="h-4 w-4" />
            {locale === "ar" ? "ادخل الآن" : "Join now"}
          </span>
        </Link>
      ))}
    </div>
  );
}
