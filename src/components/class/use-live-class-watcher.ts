"use client";

/**
 * useLiveClassWatcher — subscribes to the current user's per-user Live
 * channel (`user-live:{userId}`) so any class that starts for them
 * pops into the global Live banner without polling.
 *
 * The same hook listens for `session_ended` events so the banner
 * auto-clears when a teacher ends a class.
 *
 * Server-side broadcast happens in:
 *   - POST /api/class-sessions/[id]/start  (teacher click)
 *   - Zoom meeting.started webhook         (teacher started in Zoom UI)
 *   - Zoom meeting.ended webhook           (clear banner)
 */
import { useEffect, useRef, useState } from "react";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";

export interface LiveClassNotice {
  sessionId: string;
  classId: string;
  className: string;
  teacherName: string;
  startedAt: string;
  meetingId?: string | null;
}

export function useLiveClassWatcher(userId: string | null | undefined) {
  const [live, setLive] = useState<LiveClassNotice[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key);
    const channel = supabase.channel(`user-live:${userId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "session_started" }, ({ payload }) => {
        const p = payload as LiveClassNotice;
        if (!p?.sessionId) return;
        setLive((prev) =>
          prev.some((s) => s.sessionId === p.sessionId) ? prev : [...prev, p]
        );
      })
      .on("broadcast", { event: "session_ended" }, ({ payload }) => {
        const p = payload as { sessionId: string };
        if (!p?.sessionId) return;
        setLive((prev) => prev.filter((s) => s.sessionId !== p.sessionId));
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId]);

  /** Locally dismiss a banner (user clicked X). */
  const dismiss = (sessionId: string) => {
    setLive((prev) => prev.filter((s) => s.sessionId !== sessionId));
  };

  return { live, dismiss };
}
