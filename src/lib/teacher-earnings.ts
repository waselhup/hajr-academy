/**
 * Teacher earnings helpers — auto-create a PENDING TeacherEarning row when
 * a ClassSession transitions to COMPLETED. Idempotent: if an earning already
 * exists for the session (unique on classSessionId), this is a no-op.
 */
import { prisma } from "@/lib/prisma";

/**
 * Compute hours between two dates, clamped to [0.1h, 24h].
 * Falls back to the class default duration if startedAt/endedAt are missing.
 */
function computeHours(startedAt: Date | null, endedAt: Date | null, fallbackMinutes: number): number {
  if (startedAt && endedAt) {
    const ms = endedAt.getTime() - startedAt.getTime();
    const hours = ms / (1000 * 60 * 60);
    if (Number.isFinite(hours) && hours > 0) {
      return Math.min(24, Math.max(0.1, Math.round(hours * 100) / 100));
    }
  }
  // Fallback — class.durationMinutes
  return Math.round((fallbackMinutes / 60) * 100) / 100;
}

/**
 * Idempotently create a PENDING TeacherEarning for a completed session.
 * Returns the earning id (existing or new).
 */
export async function createEarningForSession(sessionId: string): Promise<string | null> {
  // Skip if one already exists for this session.
  const existing = await prisma.teacherEarning.findUnique({
    where: { classSessionId: sessionId },
  });
  if (existing) return existing.id;

  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: {
        select: { teacherId: true, durationMinutes: true },
      },
    },
  });
  if (!session || !session.class) return null;

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: session.class.teacherId },
    select: { id: true, hourlyRate: true },
  });
  if (!teacher) return null;

  const hours = computeHours(session.startedAt, session.endedAt, session.class.durationMinutes);
  const rate = Number(teacher.hourlyRate);
  const amount = Math.round(hours * rate * 100) / 100;

  try {
    const earning = await prisma.teacherEarning.create({
      data: {
        teacherId: teacher.id,
        classSessionId: sessionId,
        hoursWorked: hours,
        hourlyRate: rate,
        amount,
        status: "PENDING",
      },
    });
    return earning.id;
  } catch (e) {
    // Unique-violation race condition — another caller just created it.
    const fallback = await prisma.teacherEarning.findUnique({
      where: { classSessionId: sessionId },
    });
    return fallback?.id ?? null;
  }
}
