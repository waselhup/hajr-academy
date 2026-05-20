import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ZOOM_OAUTH = "https://zoom.us/oauth/token";
const ZOOM_API = "https://api.zoom.us/v2";

/**
 * SUPER_ADMIN diagnostics: confirms the Server-to-Server OAuth credentials work
 * and reports the Zoom host account currently backing all meetings.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID ?? "";
  const clientId = process.env.ZOOM_CLIENT_ID ?? "";
  const clientSecret = process.env.ZOOM_CLIENT_SECRET ?? "";

  if (!accountId || !clientId || !clientSecret) {
    return NextResponse.json({ ok: false, error: "ZOOM_NOT_CONFIGURED" }, { status: 500 });
  }

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch(
      `${ZOOM_OAUTH}?grant_type=account_credentials&account_id=${accountId}`,
      { method: "POST", headers: { Authorization: `Basic ${basic}` } }
    );
    if (!tokenRes.ok) {
      return NextResponse.json(
        { ok: false, error: "OAUTH_FAILED", status: tokenRes.status },
        { status: 502 }
      );
    }
    const { access_token } = (await tokenRes.json()) as { access_token: string };
    const meRes = await fetch(`${ZOOM_API}/users/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const me = (await meRes.json()) as {
      email?: string;
      type?: number;
      account_id?: string;
      first_name?: string;
      last_name?: string;
    };
    return NextResponse.json({
      ok: true,
      provider: process.env.VIDEO_PROVIDER ?? "zoom",
      account: {
        email: me.email,
        plan: me.type === 2 ? "Licensed/Pro" : me.type === 3 ? "On-prem" : "Basic",
        accountId: me.account_id,
        name: [me.first_name, me.last_name].filter(Boolean).join(" "),
      },
      hostEmail: process.env.ZOOM_HOST_EMAIL ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "ZOOM_HEALTH_ERROR", message: (e as Error).message },
      { status: 502 }
    );
  }
}
