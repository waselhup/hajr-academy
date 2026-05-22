/**
 * Server-side Realtime broadcast for the in-platform chat.
 *
 * Each conversation has a Supabase Realtime channel `chat:{threadId}`.
 * API routes broadcast `new_message` / `read` events on it; the client
 * (`messages-client.tsx`) subscribes and updates the UI live. Typing
 * indicators are broadcast directly from the client (low-value, high-
 * frequency — no need to round-trip the server).
 */
import { createSupabaseServiceClient } from "@/lib/supabase";

export type ChatEvent = "new_message" | "read" | "typing";

export interface BroadcastMessagePayload {
  id: string;
  threadId: string;
  fromUserId: string;
  fromName: string;
  body: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  attachmentSize: number | null;
  createdAt: string;
}

export interface BroadcastReadPayload {
  threadId: string;
  readerUserId: string;
  readAt: string;
}

function channelName(threadId: string): string {
  return `chat:${threadId}`;
}

/**
 * Broadcast an event on a thread's channel. Best-effort: a Realtime
 * failure never blocks the API response — the message is already
 * persisted, and the recipient still has the notification + polling.
 */
async function broadcast(
  threadId: string,
  event: ChatEvent,
  payload: unknown
): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient();
    const channel = supabase.channel(channelName(threadId), {
      config: { broadcast: { ack: false } },
    });
    await channel.subscribe();
    await channel.send({ type: "broadcast", event, payload });
    await supabase.removeChannel(channel);
  } catch (e) {
    console.error(`[chat/realtime] broadcast ${event} failed:`, e);
  }
}

export function broadcastNewMessage(
  threadId: string,
  payload: BroadcastMessagePayload
): Promise<void> {
  return broadcast(threadId, "new_message", payload);
}

export function broadcastRead(
  threadId: string,
  payload: BroadcastReadPayload
): Promise<void> {
  return broadcast(threadId, "read", payload);
}
