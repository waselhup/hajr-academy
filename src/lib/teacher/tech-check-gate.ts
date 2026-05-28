/**
 * Tech check gate — teachers must run a passing diagnostic
 * within the last TECH_CHECK_VALID_HOURS hours before entering /classroom.
 */
import { prisma } from "@/lib/prisma";

export const TECH_CHECK_VALID_HOURS = 4;

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
