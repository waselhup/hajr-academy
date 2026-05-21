import { NextRequest, NextResponse } from "next/server";
import { runCommsTick } from "@/lib/comms/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/comms-tick — scheduled communication checks.
 *
 * Invoked by Vercel Cron every 5 minutes (see vercel.json). Vercel cron
 * requests carry `Authorization: Bearer <CRON_SECRET>`; when `CRON_SECRET`
 * is configured the header is verified. Without it (local dev) the
 * endpoint is open so it can be triggered manually for testing.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const summary = await runCommsTick();
    return NextResponse.json({ ok: true, ...summary, ranAt: new Date().toISOString() });
  } catch (e) {
    console.error("[cron/comms-tick] failed:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "tick failed" },
      { status: 500 }
    );
  }
}

// Allow POST too (some cron setups POST).
export const POST = GET;
