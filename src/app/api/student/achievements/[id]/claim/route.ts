/**
 * POST /api/student/achievements/[id]/claim
 *   — student "claims" an unlocked achievement (UI flips it from a glowing
 *     pulse to a static trophy).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("STUDENT");
  const { id } = await params;
  const sp = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!sp) {
    return NextResponse.json({ ok: false, error: "no profile" }, { status: 400 });
  }
  try {
    const updated = await prisma.studentAchievement.update({
      where: { studentId_achievementId: { studentId: sp.id, achievementId: id } },
      data: { isClaimed: true, claimedAt: new Date() },
    });
    return NextResponse.json({ ok: true, achievement: updated });
  } catch {
    return NextResponse.json({ ok: false, error: "not unlocked" }, { status: 404 });
  }
}
