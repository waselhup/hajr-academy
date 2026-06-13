"use client";

import { useEffect } from "react";

/**
 * Self-heals the "Application error: a client-side exception has occurred"
 * white screen that appears after we ship a new deployment.
 *
 * THE PROBLEM (what the owner saw on Doaa's device):
 * Next.js splits the app into hashed JS/CSS "chunks" (e.g. `4521-ab12cd.js`).
 * Every deploy produces NEW hashes and Vercel eventually prunes the old build's
 * files. If someone still has an OLD tab open — or opens an OLD bookmark — the
 * already-loaded page tries to lazy-fetch a chunk filename that no longer exists
 * on the server. The fetch 404s, the dynamic import rejects, React has nothing
 * to render, and the browser shows the bare "client-side exception" page. The
 * very old, fully-pruned deployment URLs go one step further and return Vercel's
 * own `DEPLOYMENT_NOT_FOUND` 404 before our code ever runs (that one can only be
 * avoided by using the stable https://hajr-academy.vercel.app address).
 *
 * THE FIX:
 * A stale chunk is not a real bug — the cure is simply to reload so the browser
 * pulls the CURRENT build's chunk list. This component listens for the two ways
 * a missing chunk surfaces (a thrown ChunkLoadError and a rejected dynamic
 * import) and performs ONE hard reload. A short sessionStorage time-guard makes
 * sure we never get stuck in a reload loop if the fresh build genuinely can't
 * satisfy the request.
 *
 * Mounted once, high in the tree, from [locale]/layout.tsx. Renders nothing.
 */

const RELOAD_TS_KEY = "hajr:chunk-reload-ts";
// Don't auto-reload more than once per window — if the brand-new build ALSO
// throws a chunk error within this period it's a real failure, so we stop and
// let the error boundary show its UI instead of thrashing.
const RELOAD_GUARD_MS = 10_000;

/** True when an error is a missing-chunk / stale-build failure (not a real bug). */
function isStaleChunkError(value: unknown): boolean {
  // A rejected dynamic import / thrown ChunkLoadError carries a name + message.
  const err = value as { name?: string; message?: string } | null | undefined;
  const name = err?.name ?? "";
  const message = err?.message ?? "";
  if (name === "ChunkLoadError") return true;
  return /Loading( CSS)? chunk [\w-]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
    message,
  );
}

function recover(): void {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_TS_KEY) || 0);
    if (Date.now() - last < RELOAD_GUARD_MS) return; // already tried — avoid a loop
    sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()));
  } catch {
    // sessionStorage can throw in private mode; reloading once is still right.
  }
  // Hard reload so the document + its chunk manifest come fresh from the server.
  window.location.reload();
}

export function BuildRecovery() {
  useEffect(() => {
    // Path 1: a synchronous ChunkLoadError thrown during render/navigation.
    const onError = (e: ErrorEvent) => {
      if (isStaleChunkError(e.error) || isStaleChunkError({ message: e.message })) {
        recover();
      }
    };
    // Path 2: an async dynamic import() that rejected (the common App-Router case).
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isStaleChunkError(e.reason)) recover();
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
