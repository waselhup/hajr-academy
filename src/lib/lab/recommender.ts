/**
 * Smart exercise recommendation engine for the English Lab.
 *
 * Powers:
 * - the student dashboard "Recommended for you" section
 * - the AI agent's answer to "what should I practise?"
 * - the daily challenge (one recommended exercise)
 *
 * Algorithm:
 * 1. Read the student's skill levels (creates A1 defaults if none exist yet).
 * 2. Identify the weakest skill (lowest CEFR level, then lowest confidence).
 * 3. Filter exercises: match the weak skill, level = current or current+1,
 *    not attempted in the last 7 days, prefer STEP-tagged for STEP students.
 * 4. Rank by difficulty match, then popularity, then freshness.
 * 5. Return the top N.
 */
import { prisma } from "@/lib/prisma";
import type { CefrLevel, EnglishSkill } from "@prisma/client";

const CEFR_ORDER: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const ALL_SKILLS: EnglishSkill[] = [
  "SPEAKING", "LISTENING", "WRITING", "READING", "GRAMMAR", "VOCABULARY",
];

const SEVEN_DAYS_MS = 7 * 86400_000;

export interface RecommendedExercise {
  id: string;
  type: string;
  level: string;
  title: string;
  titleAr: string;
  estimatedMinutes: number;
  pointsValue: number;
  tags: string[];
  reason: string;
  reasonAr: string;
}

function levelIndex(level: CefrLevel): number {
  return Math.max(0, CEFR_ORDER.indexOf(level));
}

function nextLevel(level: CefrLevel): CefrLevel {
  return CEFR_ORDER[Math.min(CEFR_ORDER.length - 1, levelIndex(level) + 1)];
}

/**
 * Ensure a student has a SkillLevel row for every skill. Returns all rows.
 * New rows default to A1 / 0 confidence.
 */
export async function ensureSkillLevels(studentId: string) {
  const existing = await prisma.skillLevel.findMany({ where: { studentId } });
  const have = new Set(existing.map((s) => s.skill));
  const missing = ALL_SKILLS.filter((s) => !have.has(s));

  if (missing.length > 0) {
    await prisma.skillLevel.createMany({
      data: missing.map((skill) => ({ studentId, skill })),
      skipDuplicates: true,
    });
    return prisma.skillLevel.findMany({ where: { studentId } });
  }
  return existing;
}

/**
 * Find the weakest skill for a student: lowest CEFR level, then lowest
 * confidence as a tie-breaker. A skill with no attempts ranks as weak.
 */
export async function getWeakestSkill(studentId: string): Promise<EnglishSkill> {
  const levels = await ensureSkillLevels(studentId);
  let weakest = levels[0];
  for (const lvl of levels) {
    const a = levelIndex(lvl.currentLevel);
    const b = levelIndex(weakest.currentLevel);
    if (a < b) {
      weakest = lvl;
    } else if (a === b && Number(lvl.confidence) < Number(weakest.confidence)) {
      weakest = lvl;
    }
  }
  return weakest.skill;
}

/**
 * Recommend exercises for a student. If `skill` is given, recommends within
 * that skill; otherwise targets the student's weakest skill.
 */
export async function recommendExercises(
  studentId: string,
  limit = 5,
  forSkill?: EnglishSkill
): Promise<RecommendedExercise[]> {
  const levels = await ensureSkillLevels(studentId);
  const targetSkill = forSkill ?? (await getWeakestSkill(studentId));
  const skillLevel = levels.find((l) => l.skill === targetSkill);
  const currentLevel: CefrLevel = skillLevel?.currentLevel ?? "A1";
  const allowedLevels: CefrLevel[] = [currentLevel, nextLevel(currentLevel)];

  // Is this a STEP-track student? Check active enrollments' program codes.
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, status: "ACTIVE" },
    include: { class: { include: { program: true } } },
  });
  const isStepStudent = enrollments.some(
    (e) => e.class.program.code === "STEP_PREP" || e.class.program.code === "UNI_PREP"
  );

  // Exercises this student attempted in the last 7 days — skip those.
  const recentAttempts = await prisma.labAttempt.findMany({
    where: { studentId, startedAt: { gte: new Date(Date.now() - SEVEN_DAYS_MS) } },
    select: { exerciseId: true },
  });
  const recentIds = new Set(recentAttempts.map((a) => a.exerciseId));

  const candidates = await prisma.labExercise.findMany({
    where: {
      type: targetSkill,
      level: { in: allowedLevels },
      isPublished: true,
    },
    include: { _count: { select: { attempts: true } } },
  });

  const fresh = candidates.filter((c) => !recentIds.has(c.id));
  // If everything was attempted recently, fall back to the full set.
  const pool = fresh.length > 0 ? fresh : candidates;

  const ranked = pool
    .map((ex) => {
      let score = 0;
      // Difficulty match: current level is the best fit, +1 is a stretch.
      if (ex.level === currentLevel) score += 100;
      else score += 60;
      // Popularity: more attempts = more proven content.
      score += Math.min(30, ex._count.attempts);
      // STEP students get a boost for STEP-tagged content.
      if (isStepStudent && ex.tags.includes("step")) score += 40;
      return { ex, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map(({ ex }) => {
    const isStretch = ex.level !== currentLevel;
    return {
      id: ex.id,
      type: ex.type,
      level: ex.level,
      title: ex.title,
      titleAr: ex.titleAr,
      estimatedMinutes: ex.estimatedMinutes,
      pointsValue: ex.pointsValue,
      tags: ex.tags,
      reason: isStretch
        ? `A slightly harder ${ex.type.toLowerCase()} exercise to challenge you.`
        : `Recommended to strengthen your ${ex.type.toLowerCase()} skill.`,
      reasonAr: isStretch
        ? `تمرين ${arSkill(ex.type)} أصعب قليلاً لتتحدّى نفسك.`
        : `موصى به لتقوية مهارة ${arSkill(ex.type)} لديك.`,
    };
  });
}

/** Pick a single daily-challenge exercise for a student. */
export async function getDailyChallenge(
  studentId: string
): Promise<RecommendedExercise | null> {
  const recs = await recommendExercises(studentId, 5);
  if (recs.length === 0) return null;
  // Rotate by day-of-year so the challenge changes daily but is stable per day.
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400_000
  );
  return recs[dayOfYear % recs.length];
}

function arSkill(type: string): string {
  const map: Record<string, string> = {
    SPEAKING: "المحادثة",
    LISTENING: "الاستماع",
    WRITING: "الكتابة",
    READING: "القراءة",
    GRAMMAR: "القواعد",
    VOCABULARY: "المفردات",
  };
  return map[type] ?? type;
}
