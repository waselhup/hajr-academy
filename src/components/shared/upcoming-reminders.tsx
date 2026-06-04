"use client";

/**
 * Upcoming Reminders — calm, dismissible corner toasts that nudge the logged-in
 * user about schedule/calendar items starting soon.
 *
 * On mount it fetches the current user's near-future events
 * (GET /api/reminders/upcoming — auth-gated + role-scoped) and raises a gentle
 * sonner toast for anything inside the next ~24h, with a sharper tone for items
 * within ~1h. Toasts are staggered so several don't stack at once.
 *
 * De-spam: each (user + event) is recorded in localStorage with today's date
 * stamp; the same event is never re-toasted within the same day. Mounted once
 * in the authenticated app shell — never on public pages.
 */
import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

interface UpcomingEvent {
  id: string;
  type: string;
  title: string;
  titleAr: string;
  startAt: string;
}

const SOON_MS = 60 * 60 * 1000; // within 1h → "starting soon"
const STORAGE_PREFIX = "hajr.reminders.shown";

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function UpcomingReminders({ userId }: { userId: string }) {
  const t = useTranslations("Reminders");
  const locale = useLocale();
  const ar = locale === "ar";
  // Guard against double-run (React StrictMode mounts effects twice in dev).
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    if (typeof window === "undefined") return;

    const key = `${STORAGE_PREFIX}.${userId}`;

    function loadShown(): Record<string, string> {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, string>;
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    }

    function persistShown(map: Record<string, string>) {
      try {
        window.localStorage.setItem(key, JSON.stringify(map));
      } catch {
        /* storage full / disabled — degrade silently */
      }
    }

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/reminders/upcoming", { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { events?: UpcomingEvent[] };
        const events = Array.isArray(data.events) ? data.events : [];
        if (events.length === 0) return;

        const stamp = todayStamp();
        const shown = loadShown();
        // Drop stale stamps so the map can't grow without bound.
        const fresh: Record<string, string> = {};
        for (const [eid, s] of Object.entries(shown)) {
          if (s === stamp) fresh[eid] = s;
        }

        const now = Date.now();
        let delay = 0;
        for (const ev of events) {
          if (fresh[ev.id] === stamp) continue; // already nudged today
          const start = new Date(ev.startAt).getTime();
          if (Number.isNaN(start) || start < now) continue;

          const minsUntil = Math.max(1, Math.round((start - now) / 60000));
          const soon = start - now <= SOON_MS;
          const label = ar ? ev.titleAr || ev.title : ev.title || ev.titleAr;
          const heading = soon ? t("startingSoon") : t("upcoming");
          const description = t("startsIn", { mins: minsUntil });

          // Stagger so a burst of items doesn't slam in all at once.
          window.setTimeout(() => {
            toast(`${heading} · ${label}`, {
              description,
              duration: soon ? 9000 : 6000,
            });
          }, delay);
          delay += 700;

          fresh[ev.id] = stamp;
        }

        persistShown(fresh);
      } catch (e) {
        // Network/abort errors are non-fatal — reminders are best-effort.
        if ((e as { name?: string })?.name !== "AbortError") {
          console.warn("[upcoming-reminders] fetch failed", e);
        }
      }
    })();

    return () => controller.abort();
  }, [userId, ar, t]);

  return null;
}
