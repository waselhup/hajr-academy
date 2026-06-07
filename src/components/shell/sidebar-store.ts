"use client";
/**
 * Tiny shared store for the app shell sidebar (no external deps).
 *
 * Why this exists (F7, owner batch 4A): the desktop sidebar collapse used to be
 * private `useState` inside <Sidebar>, so nothing else could know it was
 * collapsed and there was no guaranteed re-open affordance once it was. This
 * store lifts the collapse state to a module-level value that both <Sidebar>
 * and a floating <SidebarReopenHandle> (rendered once in the (app) layout)
 * subscribe to — so a re-open handle can appear on EVERY page/shell. It also
 * exposes a one-shot "open the mobile drawer" pulse the handle uses on phones,
 * where the desktop sidebar is display:none.
 *
 * Desktop collapse is persisted to localStorage so the choice sticks across
 * navigations and reloads.
 */

const LS_COLLAPSED = "hajr.sidebar.collapsed";

type Listener = () => void;

let collapsed = false;
let hydrated = false;
const listeners = new Set<Listener>();
// Bumped each time the floating handle asks the mobile drawer to open; the
// mobile sidebar watches this value and opens when it increases.
let mobileOpenPulse = 0;

function emit() {
  for (const l of listeners) l();
}

function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    collapsed = window.localStorage.getItem(LS_COLLAPSED) === "1";
  } catch {
    collapsed = false;
  }
}

export const sidebarStore = {
  subscribe(listener: Listener): () => void {
    hydrateOnce();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Desktop collapse state (SSR-safe: false until hydrated on the client). */
  getCollapsed(): boolean {
    return collapsed;
  },
  /** Server snapshot — collapse never starts collapsed on the server. */
  getServerCollapsed(): boolean {
    return false;
  },

  setCollapsed(next: boolean) {
    hydrateOnce();
    if (collapsed === next) return;
    collapsed = next;
    try {
      window.localStorage.setItem(LS_COLLAPSED, next ? "1" : "0");
    } catch {
      /* ignore quota / private-mode errors */
    }
    emit();
  },
  toggleCollapsed() {
    this.setCollapsed(!collapsed);
  },

  /** Monotonic counter the mobile drawer watches to know when to open. */
  getMobileOpenPulse(): number {
    return mobileOpenPulse;
  },
  getServerMobileOpenPulse(): number {
    return 0;
  },
  /** Ask the mobile drawer to open (used by the floating handle on phones). */
  requestMobileOpen() {
    mobileOpenPulse += 1;
    emit();
  },
};
