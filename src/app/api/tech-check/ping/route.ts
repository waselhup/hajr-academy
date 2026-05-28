/**
 * GET /api/tech-check/ping — tiny latency endpoint.
 * Returns server timestamp. The client computes RTT.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return new NextResponse(JSON.stringify({ t: Date.now() }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store, no-cache",
    },
  });
}
