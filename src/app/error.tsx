"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const RELOAD_TS_KEY = "hajr:chunk-reload-ts";
const RELOAD_GUARD_MS = 10_000;

/** A stale-build / missing-chunk failure — fixed by reloading, not by retrying. */
function isStaleChunkError(err?: { name?: string; message?: string }): boolean {
  const name = err?.name ?? "";
  const message = err?.message ?? "";
  if (name === "ChunkLoadError") return true;
  return /Loading( CSS)? chunk [\w-]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
    message,
  );
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real error to the browser console + server logs for diagnosis.
    console.error("[AppError]", error?.message, error?.digest, error?.stack);

    // If this is a stale-build chunk failure (old tab/bookmark after a deploy),
    // `reset()` alone re-runs the SAME broken render — the cure is a hard reload
    // onto the current build's chunk manifest. One guarded attempt, no loop.
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-ivory p-6 text-center">
      <span className="text-6xl font-extrabold text-brand-rose">500</span>
      <h1 className="mt-4 text-2xl font-bold text-brand-navy">Something went wrong / حدث خطأ</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. Reloading usually fixes it.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => window.location.reload()}>
          Reload / إعادة التحميل
        </Button>
        <Button variant="outline" onClick={reset}>
          Try again / إعادة المحاولة
        </Button>
      </div>
    </div>
  );
}
