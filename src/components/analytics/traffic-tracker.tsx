"use client";

/**
 * Fires one "view" per public page and one "leave" when the visitor moves on.
 *
 * Mounted once in the public layout, so it survives client-side navigation and
 * every page is measured without touching individual pages.
 *
 * Three things it must never do: block rendering, throw, or send anything
 * identifying. All fetches are fire-and-forget with errors swallowed — a
 * failing analytics endpoint should be invisible to a visitor who came to buy
 * a course.
 */
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const ENDPOINT = "/api/analytics/traffic";

/** Deepest scroll reached, as a percentage of the scrollable height. */
function scrollDepthPercent(): number {
  if (typeof document === "undefined") return 0;
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 100; // page fits on screen; they saw all of it
  return Math.min(100, Math.max(0, Math.round((window.scrollY / scrollable) * 100)));
}

export function TrafficTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Refs, not state: these change on scroll and unload, and re-rendering the
  // whole public site to record a scroll position would be absurd.
  const enteredAt = useRef<number>(Date.now());
  const maxScroll = useRef<number>(0);
  const currentUrl = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;

    // React 18 Strict Mode mounts effects twice in development. Without this
    // guard every local page view is recorded as two, which is exactly the
    // kind of quiet doubling that makes a dashboard untrustworthy.
    if (currentUrl.current === url) return;
    currentUrl.current = url;

    enteredAt.current = Date.now();
    maxScroll.current = 0;

    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "view",
        url,
        referrer: document.referrer || null,
        locale: document.documentElement.lang || null,
      }),
      keepalive: true,
    }).catch(() => {
      // Silent by design.
    });

    const onScroll = () => {
      maxScroll.current = Math.max(maxScroll.current, scrollDepthPercent());
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const sendLeave = () => {
      const payload = JSON.stringify({
        type: "leave",
        url,
        durationSec: Math.round((Date.now() - enteredAt.current) / 1000),
        scrollDepth: Math.max(maxScroll.current, scrollDepthPercent()),
      });

      // sendBeacon is the only method browsers reliably allow during unload;
      // a normal fetch is cancelled when the page goes away. fetch+keepalive
      // is the fallback for the few browsers without it.
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }));
      } else {
        void fetch(ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    // `visibilitychange` rather than `unload`: iOS Safari often never fires
    // unload at all, and mobile is most of this traffic — relying on unload
    // would lose duration data for the majority of real visitors.
    const onHidden = () => {
      if (document.visibilityState === "hidden") sendLeave();
    };
    document.addEventListener("visibilitychange", onHidden);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHidden);
      // Client-side navigation away from this page: no visibility change
      // fires, so the page would otherwise never be closed out.
      sendLeave();
    };
  }, [pathname, searchParams]);

  return null;
}
