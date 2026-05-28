/**
 * Pure XP & level engine for student gamification (Sprint 7B).
 *
 * In Commit A this module exposes only the headers needed by other Sprint 7A
 * hooks (library progress, classroom completion). The full implementation —
 * StudentGamification model writes, achievement unlock loop, level-up notify —
 * lands in Sprint 7B alongside the gamification schema.
 *
 * All public functions are best-effort: callers MUST never block on XP.
 */
import { prisma } from "@/lib/prisma";

export interface AwardParams {
  studentId: string;
  reason: string;
  points: number;
}

/** XP → Level: floor(sqrt(xp / 100)) + 1 */
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

/**
 * Best-effort XP award. No-op when StudentGamification model is not yet
 * present (Commit A). Sprint 7B will replace this with the real writer.
 */
export async function awardXp(params: AwardParams): Promise<void> {
  try {
    // Avoid blowing up before the Sprint 7B migration lands.
    const client = prisma as unknown as {
      studentGamification?: {
        upsert: (args: unknown) => Promise<unknown>;
      };
    };
    if (!client.studentGamification) return;
    await client.studentGamification.upsert({
      where: { studentId: params.studentId } as never,
      create: {
        studentId: params.studentId,
        xp: Math.max(0, Math.round(params.points)),
        lastActiveDate: new Date(),
      } as never,
      update: {
        xp: { increment: Math.max(0, Math.round(params.points)) },
        lastActiveDate: new Date(),
      } as never,
    });
  } catch {
    // best-effort
  }
}
