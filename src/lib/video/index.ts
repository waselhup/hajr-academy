// Provider factory. Reads VIDEO_PROVIDER env (zoom | daily). Default: zoom.
// A Daily.co implementation can be slotted in later behind the same interface.

import type { VideoProvider } from "./types";
import { ZoomProvider } from "./ZoomProvider";
import { decryptSecret } from "@/lib/crypto";

let cached: VideoProvider | null = null;

export function getVideoProvider(): VideoProvider {
  if (cached) return cached;
  const choice = (process.env.VIDEO_PROVIDER ?? "zoom").toLowerCase();
  switch (choice) {
    case "zoom":
    default:
      cached = new ZoomProvider();
      return cached;
  }
}

/** Minimal shape of a ZoomAccount row needed to host a meeting. */
export type ZoomAccountLike = {
  hostEmail: string;
  accountId: string | null;
  clientId: string | null;
  clientSecretEnc: string | null;
} | null | undefined;

/**
 * Resolve which Zoom provider + host email to use for a teacher's class.
 * - account with its own creds  → a per-account provider (separate Zoom login)
 * - account without creds        → the global env connection, hosting as its hostEmail
 * - no account (legacy/today)    → the global env connection + ZOOM_HOST_EMAIL
 * Never throws; always returns a usable target so existing flows keep working.
 */
export function resolveZoomTarget(account: ZoomAccountLike): {
  provider: VideoProvider;
  hostEmail: string;
} {
  const envHost = (process.env.ZOOM_HOST_EMAIL ?? "").trim();
  if (!account) return { provider: getVideoProvider(), hostEmail: envHost };

  const hasOwnCreds = !!(account.accountId && account.clientId && account.clientSecretEnc);
  let provider: VideoProvider = getVideoProvider();
  if (hasOwnCreds) {
    try {
      provider = new ZoomProvider({
        accountId: account.accountId!,
        clientId: account.clientId!,
        clientSecret: decryptSecret(account.clientSecretEnc!),
      });
    } catch {
      // If decryption fails (e.g. ENCRYPTION_KEY missing) fall back to env creds
      // rather than breaking class start. The admin "Test connection" surfaces this.
      provider = getVideoProvider();
    }
  }
  return { provider, hostEmail: (account.hostEmail || envHost).trim() };
}

export type { VideoProvider, CreateMeetingOpts, MeetingResult, SignatureOpts } from "./types";
