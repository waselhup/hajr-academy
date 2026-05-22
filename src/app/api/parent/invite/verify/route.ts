import { NextRequest, NextResponse } from "next/server";
import { verifyParentInvite } from "@/lib/parent/invites";

export const dynamic = "force-dynamic";

/**
 * POST /api/parent/invite/verify — validate an invite code (read-only).
 *
 * Used by the registration form to confirm a code before account
 * creation. Public — no auth required, returns no sensitive data beyond
 * the linked student's display name.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = typeof body.code === "string" ? body.code : "";
    const result = await verifyParentInvite(code);

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        reason: result.reason,
        reasonAr: result.reasonAr,
      });
    }
    return NextResponse.json({
      valid: true,
      studentName: result.studentName,
    });
  } catch (e) {
    console.error("[api/parent/invite/verify] failed:", e);
    return NextResponse.json(
      { valid: false, reason: "Could not verify the code." },
      { status: 500 }
    );
  }
}
