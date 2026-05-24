/**
 * Realtime helpers for live-class status. Distinct from the chat
 * realtime helpers — this one uses the service-role Supabase client
 * (so anon-key RLS / rate limits never blocks a broadcast) and exposes
 * three channels:
 *
 *   class-session:{classId}  — per-class events for components subscribed
 *                              to a specific class (e.g. ClassRosterPanel).
 *   user-live:{userId}       — per-user "your class started" pushes; the
 *                              global live-class banner subscribes to this
 *                              for the logged-in user only.
 *   admin-live               — global admin live-monitor channel.
 *
 * All sends are best-effort: a Realtime hiccup must never break the
 * start/end-class API call.
 */
import { createSupabaseServiceClient } from "@/lib/supabase";

export type LiveEvent = "session_started" | "session_ended";

export interface LiveStartedPayload {
  sessionId: string;
  classId: string;
  className: string;
  teacherName: string;
  startedAt: string;
  meetingId?: string | null;
}

export interface LiveEndedPayload {
  sessionId: string;
  classId: string;
  endedAt: string;
}

export function classSessionChannel(classId: string): string {
  return `class-session:${classId}`;
}

export function userLiveChannel(userId: string): string {
  return `user-live:${userId}`;
}

export const ADMIN_LIVE_CHANNEL = "admin-live";

/** Send one broadcast on `channelName`, then tear down. Best-effort. */
async function sendOnce(
  channelName: string,
  event: LiveEvent,
  payload: LiveStartedPayload | LiveEndedPayload
): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient();
    const channel = supabase.channel(channelName, {
      config: { broadcast: { ack: false } },
    });
    await new Promise<void>((resolve) => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        resolve();
      };
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") done();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") done();
      });
      // Hard timeout — never hang the API call.
      setTimeout(done, 2500);
    });
    await channel.send({ type: "broadcast", event, payload });
    await supabase.removeChannel(channel);
  } catch (e) {
    console.error(`[live-realtime] ${channelName} ${event} failed:`, e);
  }
}

export async function broadcastClassSessionStarted(
  classId: string,
  payload: LiveStartedPayload
): Promise<void> {
  await sendOnce(classSessionChannel(classId), "session_started", payload);
}

export async function broadcastClassSessionEnded(
  classId: string,
  payload: LiveEndedPayload
): Promise<void> {
  await sendOnce(classSessionChannel(classId), "session_ended", payload);
}

export async function broadcastUserLive(
  userId: string,
  event: LiveEvent,
  payload: LiveStartedPayload | LiveEndedPayload
): Promise<void> {
  await sendOnce(userLiveChannel(userId), event, payload);
}

export async function broadcastAdminLive(
  event: LiveEvent,
  payload: LiveStartedPayload | LiveEndedPayload
): Promise<void> {
  await sendOnce(ADMIN_LIVE_CHANNEL, event, payload);
}

/**
 * Convenience wrapper: fan a `session_started` payload out to every
 * enrolled student's per-user channel + every active admin's per-user
 * channel + the global admin-live channel. Returns the count of pushes
 * fired (mostly for the audit log).
 */
export async function fanOutSessionStarted(
  payload: LiveStartedPayload,
  recipientUserIds: string[]
): Promise<number> {
  await Promise.all([
    broadcastClassSessionStarted(payload.classId, payload),
    broadcastAdminLive("session_started", payload),
    ...recipientUserIds.map((uid) =>
      broadcastUserLive(uid, "session_started", payload)
    ),
  ]);
  return recipientUserIds.length + 2;
}

export async function fanOutSessionEnded(
  payload: LiveEndedPayload,
  recipientUserIds: string[]
): Promise<number> {
  await Promise.all([
    broadcastClassSessionEnded(payload.classId, payload),
    broadcastAdminLive("session_ended", payload),
    ...recipientUserIds.map((uid) =>
      broadcastUserLive(uid, "session_ended", payload)
    ),
  ]);
  return recipientUserIds.length + 2;
}
