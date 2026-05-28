/**
 * Privacy helpers — we never store raw IP or User-Agent.
 * Hash both with sha256, keep the first 16 chars only.
 *
 * PDPL note: this is enough to differentiate concurrent sessions on the
 * Live tab without identifying a person to anyone reading the database.
 */
import { createHash } from "crypto";

export function shortHash(input: string | null | undefined): string | null {
  if (!input) return null;
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

export function ipFromHeaders(h: Headers): string | null {
  // Vercel/proxies — prefer forwarded-for first
  const xf = h.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return h.get("x-real-ip");
}

export function normalizeRoute(pathname: string): string {
  // Strip /ar or /en prefix; keep dynamic segments intact.
  return pathname.replace(/^\/(ar|en)(\/|$)/, "/");
}
