"use client";
import { useSyncExternalStore } from "react";
import { sidebarStore } from "./sidebar-store";

/** Subscribe to the desktop collapse state (SSR-safe via useSyncExternalStore). */
export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(
    sidebarStore.subscribe,
    sidebarStore.getCollapsed,
    sidebarStore.getServerCollapsed,
  );
}

/** Subscribe to the mobile-open pulse counter (increments => open the drawer). */
export function useMobileOpenPulse(): number {
  return useSyncExternalStore(
    sidebarStore.subscribe,
    sidebarStore.getMobileOpenPulse,
    sidebarStore.getServerMobileOpenPulse,
  );
}
