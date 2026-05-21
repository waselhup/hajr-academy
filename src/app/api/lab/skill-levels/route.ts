import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSkillLevels } from "@/lib/lab/recommender";

export const dynamic = "force-dynamic";

/**
 * GET /api/lab/skill-levels — the current student's six skill levels.
 * Missing skills are created at A1 so the response is always complete.
 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!student) {
      return NextResponse.json({ error: "No student profile" }, { status: 403 });
    }

    const levels = await ensureSkillLevels(student.id);

    return NextResponse.json({
      skillLevels: levels.map((l) => ({
        skill: l.skill,
        currentLevel: l.currentLevel,
        confidence: Number(l.confidence),
        totalAttempts: l.totalAttempts,
        totalPoints: l.totalPoints,
        lastAssessedAt: l.lastAssessedAt?.toISOString() ?? null,
        levelHistory: l.levelHistory,
      })),
    });
  } catch (e) {
    console.error("[api/lab/skill-levels] failed:", e);
    return NextResponse.json({ error: "Failed to load skill levels" }, { status: 500 });
  }
}
