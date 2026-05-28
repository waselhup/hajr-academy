"use client";

/**
 * PageVisitTracker — fire-and-forget activity beacon.
 *
 * Lives once in the app layout. On every route change AND on
 * visibilitychange=hidden, it sends a {route, enteredAt, leftAt} record to
 * /api/analytics/page-visit. Throttled to 1 beacon per 5 s per route.
 *
 * Best-effort by design; no UI feedback, no errors surfaced.
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function normalize(p: string): string {
  return p.replace(/^\/(ar|en)(\/|$)/, "/");
}

export function PageVisitTracker() {
  const pathname = usePathname();
  const lastFireRef = useRef<{ route: string; at: number } | null>(null);
  const enteredRef = useRef<{ route: string; at: number }>({
    route: normalize(pathname || "/"),
    at: Date.now(),
  });

  function send(route: string, enteredAt: number, leftAt: number) {
    if (!route) return;
    const now = Date.now();
    const last = lastFireRef.current;
    if (last && last.route === route && now - last.at < 5_000) return;
    lastFireRef.current = { route, at: now };
    const body = JSON.stringify({
      route,
      enteredAt: new Date(enteredAt).toISOString(),
      leftAt: new Date(leftAt).toISOString(),
    });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/analytics/page-visit",
          new Blob([body], { type: "application/json" })
        );
      } else {
        fetch("/api/analytics/page-visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {}
  }

  // Route change — flush the previous one
  useEffect(() => {
    const next = normalize(pathname || "/");
    const prev = enteredRef.current;
    if (prev.route !== next) {
      send(prev.route, prev.at, Date.now());
      enteredRef.current = { route: next, at: Date.now() };
    }
  }, [pathname]);

  // visibility — when tab goes hidden, flush current
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        const cur = enteredRef.current;
        send(cur.route, cur.at, Date.now());
        // Reset entered time so next visible→hidden doesn't double-count
        enteredRef.current = { ...cur, at: Date.now() };
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onVis);
    };
  }, []);

  return null;
}
