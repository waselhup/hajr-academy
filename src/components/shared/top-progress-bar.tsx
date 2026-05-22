"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * A lightweight NProgress-style top loading bar.
 *
 * The App Router has no public route-change event, so this works by:
 *  - starting the bar on any same-origin <a> click or browser back/forward,
 *  - completing it when `usePathname()` changes (the new route committed).
 *
 * Zero dependencies; the bar is a fixed 2px gradient strip at the top.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (trickle.current) {
      clearInterval(trickle.current);
      trickle.current = null;
    }
  }

  function start() {
    clearTimers();
    setVisible(true);
    setProgress(8);
    // Trickle towards ~90% while the navigation is in flight.
    trickle.current = setInterval(() => {
      setProgress((p) => (p < 90 ? p + (90 - p) * 0.15 : p));
    }, 200);
  }

  function done() {
    clearTimers();
    setProgress(100);
    timers.current.push(
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250)
    );
  }

  // Complete the bar whenever the committed pathname changes.
  useEffect(() => {
    if (visible) done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Start the bar on link clicks and history navigation.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      // Only same-origin navigations.
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search)
          return;
      } catch {
        return;
      }
      start();
    }
    function onPopState() {
      start();
    }
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
    >
      <div
        className="h-full bg-gradient-to-r from-brand-rose to-brand-lavender transition-all duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
