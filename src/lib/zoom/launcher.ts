/**
 * Shared Zoom launcher helpers — used by every "Start Class" and
 * "Join Class" button across the platform. We do NOT embed the SDK on
 * these flows; opening Zoom's own launcher URL is faster, fewer bugs,
 * and Zoom's URL handles app-vs-browser negotiation natively.
 *
 * `startClassAsTeacher`     — teacher button.
 * `joinClassAsParticipant`  — student / admin button.
 * `openZoomMeeting`         — low-level: pop a Zoom URL in a new tab,
 *                              with popup-blocker fallback.
 */
"use client";

import { toast } from "sonner";

export interface ZoomLaunchPayload {
  startUrl?: string | null;
  joinUrl?: string | null;
}

export interface StartClassResponse {
  ok: true;
  sessionId: string;
  meetingId: string;
  meetingPassword: string | null;
  zoomStartUrl: string | null;
  zoomJoinUrl: string | null;
  sessionStatus: "LIVE";
}

export interface JoinClassResponse {
  ok: true;
  sessionId: string;
  meetingId: string;
  meetingPassword: string | null;
  zoomJoinUrl: string;
  role: "STUDENT" | "ADMIN" | "PARENT";
}

/**
 * Open a Zoom meeting URL in a new tab. Falls back to a manual link
 * toast if the browser's popup blocker stops `window.open` from
 * returning a real window handle.
 */
export function openZoomMeeting(
  opts: ZoomLaunchPayload,
  fallbackToastLabel = "Open meeting"
): void {
  const url = opts.startUrl || opts.joinUrl;
  if (!url) return;
  const popup =
    typeof window !== "undefined"
      ? window.open(url, "_blank", "noopener,noreferrer")
      : null;
  if (!popup) {
    // Popup blocked — give the user a tappable link they can click.
    toast.message(fallbackToastLabel, {
      duration: 10000,
      action: {
        label: "↗",
        onClick: () => window.open(url, "_blank", "noopener,noreferrer"),
      },
    });
  }
}

/**
 * Teacher start flow. POSTs to /api/class-sessions/[id]/start, which
 * ensures the Zoom meeting exists, flips the session LIVE, broadcasts
 * to students + admins, and returns a fresh host start URL. We then
 * open Zoom in a new tab.
 */
export async function startClassAsTeacher(sessionId: string): Promise<StartClassResponse> {
  const res = await fetch(`/api/class-sessions/${sessionId}/start`, {
    method: "POST",
  });
  let body: any = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  if (!res.ok || !body.ok) {
    throw new Error(body.error || `START_${res.status}`);
  }
  openZoomMeeting({
    startUrl: body.zoomStartUrl,
    joinUrl: body.zoomJoinUrl,
  });
  return body as StartClassResponse;
}

/**
 * Student / admin join flow. POSTs to /api/class-sessions/[id]/join,
 * which validates enrollment + LIVE status and returns the join URL.
 * Throws on 409 (class hasn't started yet) — caller should catch and
 * show the friendly notify-me toast.
 */
export async function joinClassAsParticipant(sessionId: string): Promise<JoinClassResponse> {
  const res = await fetch(`/api/class-sessions/${sessionId}/join`, {
    method: "POST",
  });
  let body: any = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  if (!res.ok || !body.ok) {
    const err = new Error(body.error || `JOIN_${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  openZoomMeeting({ joinUrl: body.zoomJoinUrl });
  return body as JoinClassResponse;
}
