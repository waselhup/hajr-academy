import { NextRequest, NextResponse } from "next/server";
import { resolveActiveMarketerByCode } from "@/lib/marketer/codes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").trim().toUpperCase();
  if (!code) return NextResponse.json({ valid: false });
  const m = await resolveActiveMarketerByCode(code);
  if (!m) return NextResponse.json({ valid: false });
  return NextResponse.json({ valid: true, marketerName: m.user.name });
}
