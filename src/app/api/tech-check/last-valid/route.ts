/**
 * GET /api/tech-check/last-valid — returns the teacher's last passing check
 * and how many minutes ago it was.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { getLastTechCheckSummary } from "@/lib/teacher/tech-check-gate";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const session = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
  const last = await getLastTechCheckSummary(session.user.id);
  return NextResponse.json({ ok: true, last });
}
