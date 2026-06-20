/**
 * POST /api/ratings/dismiss — record that the caller skipped a feedback prompt,
 * so it is never shown again. Body: { kind: "CLASS" | "MONTHLY", refKey }.
 * (Submitting a rating already dedupes via TeacherRating; this covers Skip.)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  try {
    const body = await req.json().catch(() => ({}));
    const kind = String(body?.kind ?? "");
    const refKey = String(body?.refKey ?? "");
    if (!["CLASS", "MONTHLY"].includes(kind) || !refKey) {
      return NextResponse.json({ ok: false, error: "BAD_INPUT" }, { status: 400 });
    }
    await prisma.feedbackPromptLog.upsert({
      where: { userId_kind_refKey: { userId: session.user.id, kind, refKey } },
      create: { userId: session.user.id, kind, refKey, status: "SKIPPED" },
      update: {}, // already resolved → keep
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[ratings/dismiss]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
