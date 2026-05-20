import { prisma } from "@/lib/prisma";
import type { AttendanceStatus } from "@prisma/client";

/**
 * Derive a final attendance status from join/leave timestamps relative to a
 * session's scheduled window.
 *  - LATE     → joined more than 10 min after start
 *  - PRESENT  → joined on time and stayed ≥ 50% of duration
 *  - ABSENT   → never joined, or stayed < 50% of duration
 */
export function deriveAttendanceStatus(opts: {
  joinedAt: Date | null;
  leftAt: Date | null;
  sessionStart: Date;
  sessionEnd: Date;
}): AttendanceStatus {
  const { joinedAt, leftAt, sessionStart, sessionEnd } = opts;
  if (!joinedAt) return "ABSENT";

  const durationMs = Math.max(1, sessionEnd.getTime() - sessionStart.getTime());
  const lateThresholdMs = 10 * 60_000;
  const isLate = joinedAt.getTime() - sessionStart.getTime() > lateThresholdMs;

  const effectiveLeft = leftAt ?? sessionEnd;
  const attendedMs = Math.max(0, effectiveLeft.getTime() - joinedAt.getTime());
  const stayedHalf = attendedMs >= durationMs * 0.5;

  if (isLate) return "LATE";
  return stayedHalf ? "PRESENT" : "ABSENT";
}

/**
 * Finalize attendance for a session when the meeting ends:
 *  - recompute status for everyone who has an Attendance row,
 *  - create ABSENT rows for enrolled students who never joined.
 */
export async function finalizeSessionAttendance(sessionId: string) {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: { include: { enrollments: { where: { status: "ACTIVE" } } } },
      attendances: true,
    },
  });
  if (!session) return;

  const start = session.startedAt ?? session.scheduledDate;
  const end =
    session.endedAt ??
    new Date(start.getTime() + session.class.durationMinutes * 60_000);

  // Recompute existing rows.
  for (const att of session.attendances) {
    const status = deriveAttendanceStatus({
      joinedAt: att.joinedAt,
      leftAt: att.leftAt,
      sessionStart: start,
      sessionEnd: end,
    });
    await prisma.attendance.update({ where: { id: att.id }, data: { status } });
  }

  // Mark enrolled-but-never-joined students ABSENT.
  const present = new Set(session.attendances.map((a) => a.studentId));
  for (const enr of session.class.enrollments) {
    if (present.has(enr.studentId)) continue;
    await prisma.attendance.upsert({
      where: { sessionId_studentId: { sessionId, studentId: enr.studentId } },
      create: { sessionId, studentId: enr.studentId, status: "ABSENT" },
      update: { status: "ABSENT" },
    });
  }
}
