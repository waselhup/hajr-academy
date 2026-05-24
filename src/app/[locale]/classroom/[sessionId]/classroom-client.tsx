"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, AlertTriangle, ArrowLeft, ExternalLink, Smartphone, Video } from "lucide-react";
import Link from "next/link";

type Props = {
  meetingNumber: string;
  passcode: string;
  /** Zoom-hosted join URL — the "Open in Zoom" fallback. */
  joinUrl: string;
  userName: string;
  userEmail: string;
  role: "host" | "attendee";
  title: string;
  locale: string;
};

type Phase = "loading" | "joined" | "error" | "mobile";

/** Hard ceiling on the Zoom connect handshake — never circle past this. */
const JOIN_TIMEOUT_MS = 28_000;

/**
 * The Zoom Meeting SDK for Web (embedded view) does not support
 * full-feature video on mobile browsers — iOS Safari and Android Chrome
 * surface "Unable to start video at this time" even with permissions
 * granted. On those devices we present a launcher screen that opens the
 * native Zoom app, which handles camera, mic, and screen-share
 * flawlessly. Desktop browsers keep the embedded SDK.
 */
function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPadOS 13+ identifies as Mac — detect by touch capability.
  const isIpad =
    /Macintosh/i.test(ua) && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1;
  return /iPhone|iPod|Android|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) || isIpad;
}

/** Build a zoommtg:// deep link from the Zoom join URL — opens the app. */
function buildZoomAppDeepLink(joinUrl: string): string | null {
  if (!joinUrl) return null;
  try {
    const u = new URL(joinUrl);
    // Convert https://us06web.zoom.us/j/<id>?pwd=<pwd> →
    // zoommtg://us06web.zoom.us/join?confno=<id>&pwd=<pwd>
    const match = u.pathname.match(/\/j\/(\d+)/);
    if (!match) return null;
    const confno = match[1];
    const pwd = u.searchParams.get("pwd") ?? "";
    return `zoommtg://${u.hostname}/join?action=join&confno=${confno}${
      pwd ? `&pwd=${pwd}` : ""
    }`;
  } catch {
    return null;
  }
}

export function ClassroomClient({
  meetingNumber,
  passcode,
  joinUrl,
  userName,
  userEmail,
  role,
  title,
  locale,
}: Props) {
  const t = useTranslations("Classroom");
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  // Guards against the React 18 Strict-Mode double-invoke without the
  // old startedRef/cancelled deadlock (which could leave the spinner
  // stuck forever). A single attempt runs; a remount re-attempts cleanly.
  const attemptedRef = useRef(false);

  // Detect mobile on first render — done in an effect so SSR matches.
  useEffect(() => {
    if (isMobileBrowser()) {
      setPhase("mobile");
      attemptedRef.current = true; // skip the embedded-SDK boot
    }
  }, []);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    // `settled` ensures phase is set exactly once — whichever happens
    // first: a successful join, a thrown error, or the timeout.
    let settled = false;
    const settle = (next: Phase, msg = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      setErrorMsg(msg);
      setPhase(next);
    };

    // The safety net: if the Zoom handshake stalls, surface a real error
    // with a retry + an "open in Zoom" escape hatch instead of an
    // infinite spinner.
    const timeoutId = setTimeout(() => {
      console.error("[classroom] Zoom join timed out");
      settle("error", t("errTimeout"));
    }, JOIN_TIMEOUT_MS);

    (async () => {
      try {
        const { default: ZoomMtgEmbedded } = await import(
          "@zoom/meetingsdk/embedded"
        );
        if (settled) return;
        const client = ZoomMtgEmbedded.createClient();

        // Fresh signature from our backend (Zoom secrets stay server-side).
        const sigRes = await fetch("/api/zoom/signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingNumber, role, userName }),
        });
        if (settled) return;
        if (!sigRes.ok) {
          const body = await sigRes.json().catch(() => ({}));
          throw new Error(body.error ?? `SIGNATURE_${sigRes.status}`);
        }
        const { signature, sdkKey } = await sigRes.json();
        if (settled || !containerRef.current) return;

        await client.init({
          zoomAppRoot: containerRef.current,
          language: "en-US",
          patchJsMedia: true,
          // Keep the SDK's default in-meeting toolbar — it already
          // exposes camera, microphone, and screen-share controls. The
          // Permissions-Policy header on this route is what actually
          // lets the SDK call getUserMedia / getDisplayMedia.
          customize: {
            video: {
              isResizable: true,
              viewSizes: { default: { width: 0, height: 0 } },
            },
          },
        });
        if (settled) return;

        // The meeting number must be the same clean digit string the
        // signature was generated for — strip any spaces/dashes.
        const cleanMeetingNumber = meetingNumber.replace(/\D/g, "");

        await client.join({
          sdkKey,
          signature,
          meetingNumber: cleanMeetingNumber,
          password: passcode,
          userName,
          userEmail,
        });

        settle("joined");
      } catch (err) {
        console.error("Zoom join failed:", err);
        const msg = (err as Error)?.message ?? "";
        const reason = String((err as { reason?: string })?.reason ?? "");
        const combined = `${msg} ${reason}`.toLowerCase();
        let friendly: string;
        if (combined.includes("signature")) {
          friendly = t("errSignature");
        } else if (combined.includes("password")) {
          friendly = t("errWrongPassword");
        } else if (combined.includes("rate_limited")) {
          friendly = t("errRateLimited");
        } else if (combined.includes("not_authorized")) {
          friendly = t("errNotAuthorized");
        } else if (combined.includes("meeting_not_found")) {
          friendly = t("errNotStarted");
        } else {
          friendly = t("errGeneric");
        }
        settle("error", friendly);
      }
    })();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [meetingNumber, passcode, userName, userEmail, role, t]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-brand-navy">
      {/* Zoom mounts here */}
      <div ref={containerRef} className="h-full w-full" />

      {phase === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-brand-navy text-white">
          <Loader2 className="h-10 w-10 animate-spin text-brand-rose" />
          <p className="mt-4 text-lg font-medium">{t("connecting")}</p>
          <p className="mt-1 text-sm text-white/70">{title}</p>
        </div>
      )}

      {phase === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-brand-navy p-6 text-center text-white">
          <div className="rounded-2xl bg-white/10 p-10 backdrop-blur">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-300" />
            <h1 className="mt-4 text-xl font-bold">{t("cannotJoin")}</h1>
            <p className="mt-2 max-w-sm text-sm text-white/80">{errorMsg}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-hajr-deep-navy px-5 py-2 text-sm font-medium"
              >
                {t("retry")}
              </button>
              {/* Escape hatch: even if the embedded SDK fails, the class
                  is reachable through the native Zoom client. */}
              {joinUrl && (
                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2 text-sm font-medium text-brand-navy"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t("openInZoom")}
                </a>
              )}
              <Link
                href={`/${locale}`}
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-2 text-sm"
              >
                <ArrowLeft className="h-4 w-4 rtl-flip" />
                {t("backHome")}
              </Link>
            </div>
          </div>
        </div>
      )}

      {phase === "mobile" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-brand-navy p-6 text-center text-white">
          <div className="rounded-2xl bg-white/10 p-8 backdrop-blur">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-hajr-deep-navy/20">
              <Smartphone className="h-9 w-9 text-brand-rose" />
            </div>
            <h1 className="mt-5 text-xl font-bold">{t("mobileTitle")}</h1>
            <p className="mt-3 max-w-sm text-sm text-white/80">{t("mobileBody")}</p>
            <p className="mt-2 text-xs text-white/60">{title}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {/* Primary: deep-link straight into the Zoom app.
                  Falls through to the https URL if the app isn't
                  installed (Zoom's https URL itself smart-routes between
                  app and browser via App Store / Play Store). */}
              {(() => {
                const deep = buildZoomAppDeepLink(joinUrl);
                return (
                  <a
                    href={deep ?? joinUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-hajr-deep-navy px-6 py-3 text-sm font-semibold"
                  >
                    <Video className="h-4 w-4" />
                    {t("openInZoom")}
                  </a>
                );
              })()}
              {joinUrl && (
                <a
                  href={joinUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-brand-navy"
                >
                  <ExternalLink className="h-4 w-4" />
                  Zoom Web
                </a>
              )}
              <Link
                href={`/${locale}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-sm"
              >
                <ArrowLeft className="h-4 w-4 rtl-flip" />
                {t("backHome")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
