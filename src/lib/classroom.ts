import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export const JOIN_WINDOW_BEFORE_MS = 15 * 60_000; // 15 min before
export const JOIN_WINDOW_AFTER_MS = 30 * 60_000; // 30 min after start
export const START_WINDOW_BEFORE_MS = 15 * 60_000; // teacher can start 15 min before

export type ClassroomRole = "host" | "attendee";

export interface ClassroomAccess {
  ok: boolean;
  reason?:
    | "NOT_FOUND"
    | "NOT_AUTHORIZED"
    | "TOO_EARLY"
    | "ENDED"
    | "NOT_STARTED";
  role?: ClassroomRole;
  session?: {
    id: string;
    kind: "class" | "private";
    title: string;
    meetingId: string | null;
    passcode: string | null;
    scheduledDate: Date;
    durationMinutes: number;
    status: string;
  };
}

/**
 * Resolves whether a given user can enter a classroom session right now, and
 * with which Zoom role. Used by /classroom/[sessionId].
 */
export async function resolveClassroomAccess(
  sessionId: string,
  userId: string,
  userRole: Role
): Promise<ClassroomAccess> {
  // Try ClassSession first.
  const cs = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: {
        include: {
          teacher: true,
          enrollments: { where: { status: "ACTIVE" } },
        },
      },
    },
  });

  if (cs) {
    let role: ClassroomRole | null = null;
    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
      role = "host";
    } else if (userRole === "TEACHER") {
      const tp = await prisma.teacherProfile.findUnique({ where: { userId } });
      if (tp && tp.id === cs.class.teacherId) role = "host";
    } else if (userRole === "STUDENT") {
      const sp = await prisma.studentProfile.findUnique({ where: { userId } });
      if (sp && cs.class.enrollments.some((e) => e.studentId === sp.id)) role = "attendee";
    } else if (userRole === "PARENT") {
      const pp = await prisma.parentProfile.findUnique({
        where: { userId },
        include: { childLinks: true },
      });
      if (pp) {
        const childIds = pp.childLinks.map((l) => l.studentId);
        if (cs.class.enrollments.some((e) => childIds.includes(e.studentId))) {
          role = "attendee";
        }
      }
    }
    if (!role) return { ok: false, reason: "NOT_AUTHORIZED" };

    const windowCheck = checkWindow(cs.scheduledDate, cs.class.durationMinutes, role, cs.status);
    if (!windowCheck.ok) return { ok: false, reason: windowCheck.reason };

    return {
      ok: true,
      role,
      session: {
        id: cs.id,
        kind: "class",
        title: cs.class.nameAr ?? cs.class.name,
        meetingId: cs.zoomMeetingId,
        passcode: null,
        scheduledDate: cs.scheduledDate,
        durationMinutes: cs.class.durationMinutes,
        status: cs.status,
      },
    };
  }

  // Try PrivateLesson.
  const pl = await prisma.privateLesson.findUnique({
    where: { id: sessionId },
    include: { teacher: true, student: { include: { user: true } } },
  });
  if (pl) {
    let role: ClassroomRole | null = null;
    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
      role = "host";
    } else if (userRole === "TEACHER") {
      const tp = await prisma.teacherProfile.findUnique({ where: { userId } });
      if (tp && tp.id === pl.teacherId) role = "host";
    } else if (userRole === "STUDENT") {
      const sp = await prisma.studentProfile.findUnique({ where: { userId } });
      if (sp && sp.id === pl.studentId) role = "attendee";
    } else if (userRole === "PARENT") {
      const pp = await prisma.parentProfile.findUnique({
        where: { userId },
        include: { childLinks: true },
      });
      if (pp && pp.childLinks.some((l) => l.studentId === pl.studentId)) role = "attendee";
    }
    if (!role) return { ok: false, reason: "NOT_AUTHORIZED" };

    const windowCheck = checkWindow(pl.scheduledAt, pl.durationMinutes, role, pl.status);
    if (!windowCheck.ok) return { ok: false, reason: windowCheck.reason };

    return {
      ok: true,
      role,
      session: {
        id: pl.id,
        kind: "private",
        title: `Private Lesson — ${pl.student.user.name}`,
        meetingId: pl.zoomMeetingId,
        passcode: pl.zoomPassword,
        scheduledDate: pl.scheduledAt,
        durationMinutes: pl.durationMinutes,
        status: pl.status,
      },
    };
  }

  return { ok: false, reason: "NOT_FOUND" };
}

function checkWindow(
  scheduled: Date,
  durationMinutes: number,
  role: ClassroomRole,
  status: string
): { ok: true } | { ok: false; reason: "TOO_EARLY" | "ENDED" } {
  const now = Date.now();
  const start = scheduled.getTime();
  const end = start + durationMinutes * 60_000;

  if (status === "COMPLETED" || status === "CANCELLED") {
    return { ok: false, reason: "ENDED" };
  }
  const openFrom = start - (role === "host" ? START_WINDOW_BEFORE_MS : JOIN_WINDOW_BEFORE_MS);
  const closeAt = end + JOIN_WINDOW_AFTER_MS;
  if (now < openFrom) return { ok: false, reason: "TOO_EARLY" };
  if (now > closeAt) return { ok: false, reason: "ENDED" };
  return { ok: true };
}

/** True when a teacher's "Start Class" button should be enabled. */
export function isWithinStartWindow(scheduled: Date, durationMinutes: number, status: string) {
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  const now = Date.now();
  const start = scheduled.getTime();
  return now >= start - START_WINDOW_BEFORE_MS && now <= start + durationMinutes * 60_000 + JOIN_WINDOW_AFTER_MS;
}

/** True when a student's "Join Class" button should be enabled. */
export function isWithinJoinWindow(scheduled: Date, durationMinutes: number, status: string) {
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  const now = Date.now();
  const start = scheduled.getTime();
  return now >= start - JOIN_WINDOW_BEFORE_MS && now <= start + durationMinutes * 60_000 + JOIN_WINDOW_AFTER_MS;
}
