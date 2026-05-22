/**
 * Class-status realtime broadcasts (Phase 9).
 *
 * When a teacher starts or ends a class session, the change is broadcast
 * on the Supabase Realtime channel `class:{classId}`. Student and parent
 * dashboards subscribe to that channel and react instantly — no polling.
 *
 * Broadcasting is server-side: a short-lived supabase-js client is created
 * per call, the message is sent, and the channel is removed. Failures are
 * swallowed — a realtime hiccup must never break the start-class flow
 * (students still get the persisted session + a push notification).
 */

import { createClient } from "@supabase/supabase-js";

export type ClassRealtimeEvent = "class_started" | "class_ended";

export interface ClassStartedPayload {
  event: "class_started";
  classId: string;
  sessionId: string;
  zoomJoinUrl: string | null;
  className: string;
  startedAt: string;
}

export interface ClassEndedPayload {
  event: "class_ended";
  classId: string;
  sessionId: string;
  endedAt: string;
}

/** The Realtime channel name a class's events are published on. */
export function classChannel(classId: string): string {
  return `class:${classId}`;
}

/** Send a single broadcast on a class channel, then tear the channel down. */
async function broadcast(
  classId: string,
  event: ClassRealtimeEvent,
  payload: ClassStartedPayload | ClassEndedPayload
): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log(`[class-realtime:mock] ${event} on class:${classId}`);
    return false;
  }

  try {
    const supabase = createClient(url, key, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
    const channel = supabase.channel(classChannel(classId));

    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") resolve();
      });
      // Hard timeout so we never hang the request.
      setTimeout(resolve, 3000);
    });

    await channel.send({ type: "broadcast", event, payload });
    await supabase.removeChannel(channel);
    return true;
  } catch (e) {
    console.error(`[class-realtime] ${event} broadcast failed:`, e);
    return false;
  }
}

/** Broadcast that a class session has just started (students may join). */
export async function broadcastClassStarted(params: {
  classId: string;
  sessionId: string;
  zoomJoinUrl: string | null;
  className: string;
}): Promise<boolean> {
  return broadcast(params.classId, "class_started", {
    event: "class_started",
    classId: params.classId,
    sessionId: params.sessionId,
    zoomJoinUrl: params.zoomJoinUrl,
    className: params.className,
    startedAt: new Date().toISOString(),
  });
}

/** Broadcast that a class session has ended. */
export async function broadcastClassEnded(params: {
  classId: string;
  sessionId: string;
}): Promise<boolean> {
  return broadcast(params.classId, "class_ended", {
    event: "class_ended",
    classId: params.classId,
    sessionId: params.sessionId,
    endedAt: new Date().toISOString(),
  });
}
