/**
 * Tech check gate — teachers must run a passing diagnostic
 * within the last TECH_CHECK_VALID_HOURS hours before entering /classroom.
 */
import { prisma } from "@/lib/prisma";

export const TECH_CHECK_VALID_HOURS = 4;

/**
 * Class-entry grace window. A teacher who passes the tech check on their
 * dashboard gets this many minutes to enter ANY class without being asked
 * again. Deliberately separate from TECH_CHECK_VALID_HOURS so the longer
 * 4-hour rule used elsewhere stays untouched.
 */
export const TECH_CHECK_CLASS_ENTRY_MINUTES = 60;

export async function hasValidTechCheck(userId: string): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - TECH_CHECK_VALID_HOURS * 3600_000);
    const last = await prisma.techCheck.findFirst({
      where: {
        teacherId: userId,
        passed: true,
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: "desc" },
    });
    return !!last;
  } catch {
    // If the table is missing or DB is unreachable, don't block teachers.
    return true;
  }
}

export async function getLastTechCheckSummary(userId: string) {
  try {
    const row = await prisma.techCheck.findFirst({
      where: { teacherId: userId },
      orderBy: { createdAt: "desc" },
    });
    if (!row) return null;
    return {
      id: row.id,
      passed: row.passed,
      score: row.score,
      createdAt: row.createdAt,
      ageMinutes: Math.floor((Date.now() - row.createdAt.getTime()) / 60_000),
      downloadMbps: Number(row.downloadMbps),
      uploadMbps: Number(row.uploadMbps),
      latencyMs: row.latencyMs,
      audioPeakDb: Number(row.audioPeakDb),
      cameraOk: row.cameraOk,
      micOk: row.micOk,
      failureReasons: row.failureReasons,
    };
  } catch {
    return null;
  }
}

/**
 * Class-entry gate — true only if the teacher has a PASSING check within the
 * last TECH_CHECK_CLASS_ENTRY_MINUTES (the 1-hour grace window). Used at the
 * moment a teacher starts/enters a class; intentionally stricter and shorter
 * than `hasValidTechCheck` so passing on the dashboard frees only the next hour.
 */
export async function hasValidTechCheckForClassEntry(userId: string): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - TECH_CHECK_CLASS_ENTRY_MINUTES * 60_000);
    const last = await prisma.techCheck.findFirst({
      where: {
        teacherId: userId,
        passed: true,
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    return !!last;
  } catch {
    // If the table is missing or DB is unreachable, don't block teachers.
    return true;
  }
}

export type TechCheckCardState = "none" | "valid" | "expired";

/**
 * Dashboard card state for the proactive tech-check card.
 *   - "none"    → no passing check on record
 *   - "valid"   → a passing check within the 1-hour grace window
 *   - "expired" → last passing check is older than the grace window
 *
 * `minutesLeft` is the whole minutes remaining in the grace window when valid.
 * Never throws — degrades to "none" so the dashboard always renders.
 */
export async function getTechCheckCardState(
  userId: string
): Promise<{ state: TechCheckCardState; minutesLeft: number }> {
  try {
    const last = await prisma.techCheck.findFirst({
      where: { teacherId: userId, passed: true },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (!last) return { state: "none", minutesLeft: 0 };
    const ageMs = Date.now() - last.createdAt.getTime();
    const windowMs = TECH_CHECK_CLASS_ENTRY_MINUTES * 60_000;
    if (ageMs <= windowMs) {
      return { state: "valid", minutesLeft: Math.max(1, Math.ceil((windowMs - ageMs) / 60_000)) };
    }
    return { state: "expired", minutesLeft: 0 };
  } catch {
    return { state: "none", minutesLeft: 0 };
  }
}
