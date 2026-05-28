/**
 * POST /api/gamification/award-xp — server-internal helper to award XP.
 *
 * Authenticated callers (admin/super_admin/teacher) can award arbitrary
 * XP to a student — useful for class completion hooks and manual seeding.
 * Students cannot self-award (use the existing classroom + library hooks).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { awardXp } from "@/lib/gamification/xp";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await requireRole("ADMIN", "SUPER_ADMIN", "TEACHER");
  const body = (await req.json().catch(() => ({}))) as {
    studentId?: string;
    points?: number;
    reason?: string;
  };
  if (!body.studentId || !body.points) {
    return NextResponse.json(
      { ok: false, error: "studentId + points required" },
      { status: 400 }
    );
  }
  await awardXp({
    studentId: body.studentId,
    points: Math.max(0, Math.round(body.points)),
    reason: body.reason ?? "manual",
  });
  return NextResponse.json({ ok: true });
}
