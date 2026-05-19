import { NextResponse } from "next/server";
import { z } from "zod";

// Reset link issuance is wired in Phase 8 (notifications/email). This endpoint
// always returns the same success payload to prevent email enumeration.
const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: true });
}
