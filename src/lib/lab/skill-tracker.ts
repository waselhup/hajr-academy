/**
 * Skill-level tracking for the English Lab.
 *
 * After each completed attempt, the student's SkillLevel for that skill
 * is recalculated as a rolling average of their last 10 scored attempts
 * at that skill. The CEFR level is derived from that rolling average and
 * promotes/demotes the student gradually. Confidence reflects how many
 * recent attempts back the assessment.
 */
import { prisma } from "@/lib/prisma";
import type { CefrLevel, EnglishSkill, ExerciseType } from "@prisma/client";

const CEFR_ORDER: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Map a 0-100 rolling average to a CEFR band. */
function scoreToCefr(avg: number): CefrLevel {
  if (avg >= 90) return "C2";
  if (avg >= 78) return "C1";
  if (avg >= 65) return "B2";
  if (avg >= 50) return "B1";
  if (avg >= 35) return "A2";
  return "A1";
}

/** Exercise types map 1:1 onto English skills. */
export function exerciseTypeToSkill(type: ExerciseType): EnglishSkill {
  return type as unknown as EnglishSkill;
}

/**
 * Recalculate and persist a student's SkillLevel for one skill after an
 * attempt completes. Returns the updated level info.
 */
export async function updateSkillLevel(
  studentId: string,
  skill: EnglishSkill,
  pointsEarned: number
): Promise<{ level: CefrLevel; confidence: number; changed: boolean }> {
  // Last 10 scored attempts for exercises of this skill.
  const recent = await prisma.labAttempt.findMany({
    where: {
      studentId,
      status: "COMPLETED",
      score: { not: null },
      exercise: { type: skill as unknown as ExerciseType },
    },
    orderBy: { completedAt: "desc" },
    take: 10,
    select: { score: true },
  });

  const scores = recent.map((r) => Number(r.score ?? 0));
  const rollingAvg =
    scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
  const newLevel = scoreToCefr(rollingAvg);
  // Confidence grows with sample size, capped at 100 (10 attempts = full).
  const confidence = Math.min(100, scores.length * 10);

  const existing = await prisma.skillLevel.findUnique({
    where: { studentId_skill: { studentId, skill } },
  });

  const prevLevel = existing?.currentLevel ?? "A1";
  const changed = prevLevel !== newLevel;

  // Append to level history only when the band actually changes.
  const history = Array.isArray(existing?.levelHistory)
    ? (existing!.levelHistory as unknown[])
    : [];
  const nextHistory = changed
    ? [
        ...history,
        { level: newLevel, achievedAt: new Date().toISOString(), basedOn: scores.length },
      ]
    : history;

  await prisma.skillLevel.upsert({
    where: { studentId_skill: { studentId, skill } },
    create: {
      studentId,
      skill,
      currentLevel: newLevel,
      confidence,
      levelHistory: nextHistory as object,
      totalAttempts: 1,
      totalPoints: Math.round(pointsEarned),
      lastAssessedAt: new Date(),
    },
    update: {
      currentLevel: newLevel,
      confidence,
      levelHistory: nextHistory as object,
      totalAttempts: { increment: 1 },
      totalPoints: { increment: Math.round(pointsEarned) },
      lastAssessedAt: new Date(),
    },
  });

  return { level: newLevel, confidence, changed };
}

export { CEFR_ORDER, scoreToCefr };
