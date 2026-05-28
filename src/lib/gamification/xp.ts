/**
 * XP & level engine + auto-unlock check.
 *
 * All public functions are best-effort: callers MUST never block on these.
 *
 * Level formula: level = floor(sqrt(xp / 100)) + 1
 */
import { prisma } from "@/lib/prisma";
import type { AgeTier } from "@prisma/client";

export interface AwardParams {
  studentId: string;
  reason: string;
  points: number;
}

export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function xpForNextLevel(currentXp: number): number {
  const lvl = levelFromXp(currentXp);
  return lvl * lvl * 100;
}

export function xpProgressInLevel(xp: number): { pct: number; current: number; next: number } {
  const lvl = levelFromXp(xp);
  const floor = (lvl - 1) * (lvl - 1) * 100;
  const ceil = lvl * lvl * 100;
  const span = Math.max(1, ceil - floor);
  return {
    pct: Math.max(0, Math.min(100, Math.round(((xp - floor) / span) * 100))),
    current: floor,
    next: ceil,
  };
}

export function computeAgeTier(
  birthDate: Date | null,
  gradeLevel: string | null
): AgeTier {
  if (gradeLevel) {
    const num = parseInt(gradeLevel, 10);
    if (!isNaN(num)) {
      if (num >= 1 && num <= 3) return "TIER_1_3";
      if (num >= 4 && num <= 6) return "TIER_4_6";
      if (num >= 7 && num <= 9) return "MIDDLE";
      if (num >= 10 && num <= 12) return "HIGH";
    }
  }
  if (birthDate) {
    const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (age < 10) return "TIER_1_3";
    if (age < 13) return "TIER_4_6";
    if (age < 16) return "MIDDLE";
    return "HIGH";
  }
  return "MIDDLE";
}

/**
 * Award XP. Updates StudentGamification.
 * Also updates streakDays and re-checks any "first X" achievements.
 *
 * Returns the updated row, or null on any error (best-effort).
 */
export async function awardXp(params: AwardParams): Promise<void> {
  if (params.points <= 0) return;
  try {
    const sp = await prisma.studentProfile.findUnique({
      where: { id: params.studentId },
      select: { id: true, birthDate: true, gradeLevel: true },
    });
    if (!sp) return;
    const ageTier = computeAgeTier(sp.birthDate, sp.gradeLevel);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.studentGamification.findUnique({
      where: { studentId: params.studentId },
    });

    let newStreak = existing?.streakDays ?? 0;
    let streakBonus = 0;
    if (existing) {
      const last = new Date(existing.lastActiveDate);
      last.setHours(0, 0, 0, 0);
      const dayMs = 86400_000;
      const diffDays = Math.round((today.getTime() - last.getTime()) / dayMs);
      if (diffDays === 0) {
        // same day — keep streak
      } else if (diffDays === 1) {
        newStreak += 1;
        if (newStreak % 7 === 0) streakBonus = 20;
      } else {
        newStreak = 1; // reset
      }
    } else {
      newStreak = 1;
    }

    const totalPoints = Math.round(params.points + streakBonus);
    const next = await prisma.studentGamification.upsert({
      where: { studentId: params.studentId },
      create: {
        studentId: params.studentId,
        xp: totalPoints,
        level: levelFromXp(totalPoints),
        streakDays: newStreak,
        lastActiveDate: new Date(),
        ageTier,
      },
      update: {
        xp: { increment: totalPoints },
        streakDays: newStreak,
        lastActiveDate: new Date(),
        ageTier,
      },
    });

    // Refresh level based on new total
    const fresh = await prisma.studentGamification.findUnique({
      where: { studentId: params.studentId },
    });
    if (fresh && fresh.level !== levelFromXp(fresh.xp)) {
      await prisma.studentGamification.update({
        where: { studentId: params.studentId },
        data: { level: levelFromXp(fresh.xp) },
      });
    }

    // Best-effort achievement check
    await maybeUnlockAchievements(params.studentId, params.reason).catch(() => {});
  } catch {
    // best-effort
  }
}

async function maybeUnlockAchievements(studentId: string, reason: string) {
  const REASON_TO_KEYS: Record<string, string[]> = {
    first_login: ["first_login"],
    class_attended: ["first_class"],
    homework_done: ["first_homework"],
    library_item_completed: ["first_library_item"],
    library_exercise_passed: [],
    step_module_passed: ["first_step_module"],
    monthly_billing: ["month_one_complete"],
  };
  const candidateKeys = REASON_TO_KEYS[reason] ?? [];
  if (candidateKeys.length === 0) return;

  for (const key of candidateKeys) {
    try {
      const ach = await prisma.achievement.findUnique({ where: { key } });
      if (!ach || !ach.isActive) continue;
      const alreadyEarned = await prisma.studentAchievement.findUnique({
        where: { studentId_achievementId: { studentId, achievementId: ach.id } },
      });
      if (alreadyEarned) continue;
      await prisma.studentAchievement.create({
        data: { studentId, achievementId: ach.id },
      });
      if (ach.xpReward > 0) {
        await prisma.studentGamification
          .update({
            where: { studentId },
            data: { xp: { increment: ach.xpReward } },
          })
          .catch(() => {});
      }
    } catch {
      // skip
    }
  }
}
