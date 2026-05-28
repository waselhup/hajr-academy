/**
 * GET /api/tech-check/speed-blob — returns ~5 MB of pseudo-random bytes
 * so the client can measure download throughput. Cache-disabled.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SIZE = 5 * 1024 * 1024; // 5 MB

export async function GET() {
  // Build a 5 MB buffer of repeating pattern bytes — cheap & predictable.
  const chunk = Buffer.alloc(64 * 1024);
  for (let i = 0; i < chunk.length; i++) {
    chunk[i] = (i * 31 + 17) & 0xff;
  }
  const reps = SIZE / chunk.length;
  const parts: Buffer[] = [];
  for (let i = 0; i < reps; i++) parts.push(chunk);
  const body = Buffer.concat(parts);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(body.length),
      "cache-control": "no-store, no-cache",
    },
  });
}
