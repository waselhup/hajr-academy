/**
 * Shared Zoom launcher helpers — used by every "Start Class" and
 * "Join Class" button across the platform. We do NOT embed the SDK on
 * these flows; opening Zoom's own launcher URL is faster, fewer bugs,
 * and Zoom's URL handles app-vs-browser negotiation natively.
 *
 * IMPORTANT: browsers block window.open() that isn't called
 * synchronously inside a user gesture. Our APIs are async (we have to
 * fetch the start/join URL from the server first), so the pattern is:
 *
 *   1. On click — synchronously open a blank popup. This satisfies the
 *      "user gesture" rule and reserves the tab.
 *   2. Kick off the fetch.
 *   3. When the fetch resolves, redirect the popup we already opened
 *      (popup.location.href = url). If the popup got blocked anyway,
 *      fall back to a sticky toast with a clickable "open Zoom" link.
 */
"use client";

import { toast } from "sonner";

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
 * Reserve a popup synchronously (must be called inside the click
 * handler). Returns the window handle, or null if blocked. Callers
 * then either redirect it or close it.
 */
export function reservePopup(): Window | null {
  if (typeof window === "undefined") return null;
  // Open about:blank so we get a real handle the user can see.
  // "noopener" omitted intentionally — we need to mutate .location later.
  return window.open("about:blank", "_blank");
}

/**
 * Redirect a previously-reserved popup to `url`. If the popup was
 * blocked, show a sticky toast with a click-to-open link so the user
 * always has an escape hatch.
 */
export function redirectPopup(
  popup: Window | null,
  url: string,
  fallback: { label: string; action: string }
): void {
  if (popup && !popup.closed) {
    try {
      popup.location.href = url;
      return;
    } catch {
      // Cross-origin write failures are rare for blank popups — fall
      // through to the toast.
    }
  }
  // Popup was blocked or closed — show a sticky toast with a real link
  // the user can click. Using `toast.message` with an action button
  // keeps the click counted as a user gesture, so the second open
  // works even with strict popup blockers.
  toast(fallback.label, {
    duration: 30_000,
    action: {
      label: fallback.action,
      onClick: () => {
        window.open(url, "_blank", "noopener,noreferrer");
      },
    },
  });
}

/**
 * Close a popup that we no longer need (e.g. the API call failed).
 */
export function closePopup(popup: Window | null): void {
  if (popup && !popup.closed) {
    try {
      popup.close();
    } catch {
      // ignore
    }
  }
}

/**
 * Teacher start flow.
 *
 * Pass a `popup` you reserved synchronously inside the click handler
 * (so the browser counts it as a user gesture). We POST to the start
 * route, then redirect that popup to Zoom's host start URL. If the URL
 * is missing or the popup got blocked, the toast fallback covers it.
 *
 * `fallback` is a translated { label, action } pair so the toast
 * speaks the user's language.
 */
export async function startClassAsTeacher(
  sessionId: string,
  popup: Window | null,
  fallback: { label: string; action: string }
): Promise<StartClassResponse> {
  let res: Response;
  try {
    res = await fetch(`/api/class-sessions/${sessionId}/start`, {
      method: "POST",
    });
  } catch (e) {
    closePopup(popup);
    throw e;
  }
  let body: any = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  if (!res.ok || !body.ok) {
    closePopup(popup);
    throw new Error(body.error || `START_${res.status}`);
  }
  const url = body.zoomStartUrl || body.zoomJoinUrl;
  if (!url) {
    closePopup(popup);
    throw new Error("NO_ZOOM_URL");
  }
  redirectPopup(popup, url, fallback);
  return body as StartClassResponse;
}

/**
 * Teacher AD-HOC start flow — open a class room on demand with no scheduled
 * session. Same synchronous-popup contract as startClassAsTeacher: reserve the
 * popup inside the click handler, then we redirect it to Zoom's host start URL.
 *
 * Hits POST /api/teacher/classes/[classId]/start-now, which creates (or reuses)
 * a live session for the class. Returns the same shape as the scheduled start.
 */
export async function startClassNow(
  classId: string,
  popup: Window | null,
  fallback: { label: string; action: string },
): Promise<StartClassResponse> {
  let res: Response;
  try {
    res = await fetch(`/api/teacher/classes/${classId}/start-now`, {
      method: "POST",
    });
  } catch (e) {
    closePopup(popup);
    throw e;
  }
  let body: any = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  if (!res.ok || !body.ok) {
    closePopup(popup);
    throw new Error(body.error || `START_NOW_${res.status}`);
  }
  const url = body.zoomStartUrl || body.zoomJoinUrl;
  if (!url) {
    closePopup(popup);
    throw new Error("NO_ZOOM_URL");
  }
  redirectPopup(popup, url, fallback);
  return body as StartClassResponse;
}

/**
 * Student / admin join flow. Same popup-reserve pattern.
 */
export async function joinClassAsParticipant(
  sessionId: string,
  popup: Window | null,
  fallback: { label: string; action: string }
): Promise<JoinClassResponse> {
  let res: Response;
  try {
    res = await fetch(`/api/class-sessions/${sessionId}/join`, {
      method: "POST",
    });
  } catch (e) {
    closePopup(popup);
    throw e;
  }
  let body: any = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  if (!res.ok || !body.ok) {
    closePopup(popup);
    const err = new Error(body.error || `JOIN_${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  if (!body.zoomJoinUrl) {
    closePopup(popup);
    throw new Error("NO_ZOOM_URL");
  }
  redirectPopup(popup, body.zoomJoinUrl, fallback);
  return body as JoinClassResponse;
}
