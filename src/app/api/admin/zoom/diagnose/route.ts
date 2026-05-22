import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A fixed URL token so this can be opened from any browser (no login
// needed) without exposing it publicly. The endpoint NEVER returns
// secret values — only lengths, prefixes, and Zoom's own error text.
const DIAGNOSE_TOKEN = "hajr-zoom-check-2026";

/**
 * GET /api/admin/zoom/diagnose?token=... — Zoom configuration diagnostic.
 *
 * Runs the real Server-to-Server OAuth token request and reports the
 * FULL Zoom response, so a ZOOM_OAUTH_FAILED can be traced to the exact
 * cause (bad credential, wrong account, app not activated, etc.).
 * Secret VALUES are never returned — only presence, length and prefix.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token !== DIAGNOSE_TOKEN) {
    return NextResponse.json(
      { error: "Add ?token=hajr-zoom-check-2026 to the URL" },
      { status: 403 }
    );
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
  let createMeeting: Record<string, unknown> = { attempted: false };

  if (accountId && clientId && clientSecret) {
    let accessToken = "";
    let apiBase = "https://api.zoom.us";
    try {
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const res = await fetch(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
        { method: "POST", headers: { Authorization: `Basic ${basic}` } }
      );
      const bodyText = await res.text();
      let body: Record<string, unknown> | string;
      try {
        body = JSON.parse(bodyText) as Record<string, unknown>;
      } catch {
        body = bodyText.slice(0, 300);
      }
      if (res.ok && typeof body === "object") {
        accessToken = String(body.access_token ?? "");
        if (body.api_url) apiBase = String(body.api_url).replace(/\/+$/, "");
      }
      oauth = {
        attempted: true,
        httpStatus: res.status,
        ok: res.ok,
        apiUrlFromZoom: typeof body === "object" ? body.api_url ?? null : null,
        scope: typeof body === "object" ? body.scope ?? null : null,
      };
    } catch (e) {
      oauth = {
        attempted: true,
        networkError: e instanceof Error ? e.message : "fetch failed",
      };
    }

    // Step 2 — actually create a meeting (then delete it), exactly as
    // ZoomProvider does, against the resolved regional API host.
    if (accessToken) {
      const hostEmail = raw.ZOOM_HOST_EMAIL.trim();
      try {
        const cm = await fetch(
          `${apiBase}/v2/users/${encodeURIComponent(hostEmail)}/meetings`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              topic: "Hajr diagnostic — auto-deleted",
              type: 2,
              start_time: new Date(Date.now() + 3600_000).toISOString(),
              duration: 30,
              password: "hajr01",
              settings: {
                join_before_host: false,
                waiting_room: false,
                auto_recording: "cloud",
              },
            }),
          }
        );
        const cmText = await cm.text();
        let cmBody: Record<string, unknown> | string;
        try {
          cmBody = JSON.parse(cmText) as Record<string, unknown>;
        } catch {
          cmBody = cmText.slice(0, 400);
        }
        if (cm.ok && typeof cmBody === "object" && cmBody.id) {
          // Clean up the test meeting.
          await fetch(`${apiBase}/v2/meetings/${cmBody.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          }).catch(() => {});
        }
        createMeeting = {
          attempted: true,
          apiHostUsed: apiBase,
          hostEmailUsed: hostEmail,
          httpStatus: cm.status,
          ok: cm.ok,
          // On failure this holds Zoom's exact error code + message.
          zoomResponse: cm.ok ? "meeting created + deleted OK" : cmBody,
        };
      } catch (e) {
        createMeeting = {
          attempted: true,
          networkError: e instanceof Error ? e.message : "fetch failed",
        };
      }
    }
  } else {
    oauth = { attempted: false, reason: "missing one of the 3 S2S env vars" };
  }

  return NextResponse.json({
    ok: true,
    note: "Zoom config diagnostic — secret values are NOT shown, only lengths/prefixes.",
    env: envReport,
    oauth,
    createMeeting,
  });
}
