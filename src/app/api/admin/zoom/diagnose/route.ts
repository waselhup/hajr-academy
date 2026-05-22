import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/zoom/diagnose — Zoom configuration diagnostic.
 *
 * Admin-only. Runs the real Server-to-Server OAuth token request and
 * reports the FULL Zoom response, so a ZOOM_OAUTH_FAILED can be traced
 * to the exact cause (bad credential, wrong account, app not activated,
 * etc.). Secret VALUES are never returned — only presence and length,
 * plus a short prefix so a wrong-value paste is visible.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN", "TEACHER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Inspect the env vars (lengths + prefixes only — never full secrets).
  const raw = {
    ZOOM_ACCOUNT_ID: process.env.ZOOM_ACCOUNT_ID ?? "",
    ZOOM_CLIENT_ID: process.env.ZOOM_CLIENT_ID ?? "",
    ZOOM_CLIENT_SECRET: process.env.ZOOM_CLIENT_SECRET ?? "",
    ZOOM_SDK_KEY: process.env.ZOOM_SDK_KEY ?? "",
    ZOOM_SDK_SECRET: process.env.ZOOM_SDK_SECRET ?? "",
    ZOOM_HOST_EMAIL: process.env.ZOOM_HOST_EMAIL ?? "",
  };

  const inspect = (v: string) => ({
    present: v.length > 0,
    length: v.length,
    trimmedLength: v.trim().length,
    hasWhitespace: v !== v.trim(),
    prefix: v.trim().slice(0, 4),
  });

  const envReport: Record<string, ReturnType<typeof inspect>> = {};
  for (const [k, v] of Object.entries(raw)) envReport[k] = inspect(v);

  // Run the real OAuth token request (trimmed, exactly like ZoomProvider).
  const accountId = raw.ZOOM_ACCOUNT_ID.trim();
  const clientId = raw.ZOOM_CLIENT_ID.trim();
  const clientSecret = raw.ZOOM_CLIENT_SECRET.trim();

  let oauth: Record<string, unknown> = { attempted: false };
  if (accountId && clientId && clientSecret) {
    try {
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const res = await fetch(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
        { method: "POST", headers: { Authorization: `Basic ${basic}` } }
      );
      const bodyText = await res.text();
      let body: unknown;
      try {
        body = JSON.parse(bodyText);
      } catch {
        body = bodyText.slice(0, 300);
      }
      oauth = {
        attempted: true,
        httpStatus: res.status,
        ok: res.ok,
        // The full Zoom response — this is the actual diagnosis.
        zoomResponse: body,
      };
    } catch (e) {
      oauth = {
        attempted: true,
        networkError: e instanceof Error ? e.message : "fetch failed",
      };
    }
  } else {
    oauth = { attempted: false, reason: "missing one of the 3 S2S env vars" };
  }

  return NextResponse.json({
    ok: true,
    note: "Zoom config diagnostic — secret values are NOT shown, only lengths/prefixes.",
    env: envReport,
    oauth,
  });
}
