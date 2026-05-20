"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Props = {
  meetingNumber: string;
  passcode: string;
  userName: string;
  userEmail: string;
  role: "host" | "attendee";
  title: string;
  locale: string;
};

type Phase = "loading" | "joined" | "error";

export function ClassroomClient({
  meetingNumber,
  passcode,
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
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const { default: ZoomMtgEmbedded } = await import("@zoom/meetingsdk/embedded");
        const client = ZoomMtgEmbedded.createClient();

        // Fetch a fresh signature from our backend (Zoom secrets stay server-side).
        const sigRes = await fetch("/api/zoom/signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingNumber, role, userName }),
        });
        if (!sigRes.ok) {
          const body = await sigRes.json().catch(() => ({}));
          throw new Error(body.error ?? `SIGNATURE_${sigRes.status}`);
        }
        const { signature, sdkKey } = await sigRes.json();
        if (cancelled || !containerRef.current) return;

        await client.init({
          zoomAppRoot: containerRef.current,
          language: "en-US",
          patchJsMedia: true,
          customize: {
            video: { isResizable: true, viewSizes: { default: { width: 0, height: 0 } } },
          },
        });

        await client.join({
          sdkKey,
          signature,
          meetingNumber,
          password: passcode,
          userName,
          userEmail,
        });

        if (!cancelled) setPhase("joined");
      } catch (err) {
        console.error("Zoom join failed:", err);
        if (cancelled) return;
        const msg = (err as Error).message ?? "";
        if (msg.includes("password") || msg.includes("Password")) setErrorMsg(t("errWrongPassword"));
        else if (msg.includes("RATE_LIMITED")) setErrorMsg(t("errRateLimited"));
        else if (msg.includes("NOT_AUTHORIZED")) setErrorMsg(t("errNotAuthorized"));
        else if (msg.includes("MEETING_NOT_FOUND")) setErrorMsg(t("errNotStarted"));
        else setErrorMsg(t("errGeneric"));
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
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
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-brand-rose px-5 py-2 text-sm font-medium"
              >
                {t("retry")}
              </button>
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
    </div>
  );
}
