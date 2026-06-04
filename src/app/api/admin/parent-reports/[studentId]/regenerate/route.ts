/**
 * POST /api/admin/parent-reports/[studentId]/regenerate
 * Body: { year: number, month: number }
 * Admin-only manual trigger.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { generateMonthlyReport } from "@/lib/reports/generate-monthly";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ studentId: string }> }
) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const { studentId } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as {
    year?: number;
    month?: number;
  };
  if (!body.year || !body.month || body.month < 1 || body.month > 12) {
    return NextResponse.json(
      { ok: false, error: "year and month (1-12) required" },
      { status: 400 }
    );
  }
  try {
    const res = await generateMonthlyReport({
      studentId,
      year: body.year,
      month: body.month,
      generatedById: session.user.id,
    });
    return NextResponse.json(res);
  } catch (e) {
    console.error("[admin/parent-reports/regenerate] failed:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}
