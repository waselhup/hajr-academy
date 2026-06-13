"use client";

import { useEffect } from "react";

/**
 * Root-level error boundary.
 *
 * `error.tsx` (the segment boundary) renders INSIDE the root layout, so it can
 * only catch errors thrown by pages BELOW the layout. If an error escapes all
 * the way to the root — or happens before the app shell mounts — Next.js falls
 * back to its built-in, bare "Application error: a client-side exception has
 * occurred (see the browser console for more information)" white screen. That
 * is precisely the screen the owner photographed on Doaa's phone.
 *
 * `global-error.tsx` is the ONLY file that replaces that bare fallback. Because
 * it stands in for the root layout it must render its own <html>/<body> and
 * cannot count on globals.css being present — so the styling here is inline and
 * self-contained, guaranteeing a friendly, on-brand page no matter what failed.
 *
 * It also makes one more attempt to self-heal: the most common trigger is a
 * stale build (old tab / old bookmark requesting JS chunks that a newer deploy
 * has pruned). For that case the cure is a reload onto the current build, so we
 * try exactly one guarded reload before showing the manual recovery UI.
 */

const RELOAD_TS_KEY = "hajr:chunk-reload-ts";
const RELOAD_GUARD_MS = 10_000;

function isStaleChunkError(err?: { name?: string; message?: string }): boolean {
  const name = err?.name ?? "";
  const message = err?.message ?? "";
  if (name === "ChunkLoadError") return true;
  return /Loading( CSS)? chunk [\w-]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
    message,
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error?.message, error?.digest, error?.stack);

    // Stale-build crash → one guarded hard reload onto the current deployment.
    if (isStaleChunkError(error)) {
      try {
        const last = Number(sessionStorage.getItem(RELOAD_TS_KEY) || 0);
        if (Date.now() - last >= RELOAD_GUARD_MS) {
          sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()));
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <html lang="en-GB" dir="ltr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "1.5rem",
          textAlign: "center",
          background: "#FBF7F0",
          color: "#1E2A36",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: "2.5rem" }}>⚠️</div>
        <h1 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, direction: "rtl" }}>
          حدث خطأ غير متوقع
        </p>
        <p style={{ maxWidth: "26rem", fontSize: "0.9rem", color: "#5b6672", margin: "0.25rem 0 1rem" }}>
          Please reload the page. If it keeps happening, open the site fresh from
          <br />
          <strong>hajr-academy.vercel.app</strong>
          <br />
          <span style={{ direction: "rtl", display: "inline-block", marginTop: 4 }}>
            يرجى إعادة تحميل الصفحة. وإن تكرر الخطأ، افتح الموقع من جديد عبر الرابط أعلاه.
          </span>
        </p>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "0.6rem",
              border: "none",
              background: "#1E2A36",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload / إعادة التحميل
          </button>
          <button
            onClick={() => {
              try {
                reset();
              } catch {
                window.location.reload();
              }
            }}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "0.6rem",
              border: "1px solid #d6cfc4",
              background: "transparent",
              color: "#1E2A36",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again / إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
