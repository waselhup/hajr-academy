/**
 * Universal Calendar — server helpers.
 *
 * Visibility rules:
 *   SUPER_ADMIN / ADMIN → all events
 *   TEACHER            → own personal + classes they teach + global + audienceRole=TEACHER
 *   STUDENT            → own personal + enrolled classes + global + audienceRole=STUDENT
 *   PARENT             → own personal + linked children's classes + global + audienceRole=PARENT
 *   MARKETER           → own personal + global + audienceRole=MARKETER
 * Holidays (isGlobal=true, type=HOLIDAY) are visible to everyone.
 */
import { prisma } from "@/lib/prisma";
import type {
  CalendarEvent,
  CalendarEventType,
  Role,
  Prisma,
} from "@prisma/client";

export interface GetEventsOpts {
  userId: string;
  role: Role;
  from: Date;
  to: Date;
  types?: CalendarEventType[];
}

/** Build the where clause for a role-scoped calendar query. */
async function buildWhere(opts: GetEventsOpts): Promise<Prisma.CalendarEventWhereInput> {
  const { userId, role, from, to, types } = opts;
  const dateRange = {
    OR: [
      { startAt: { gte: from, lte: to } },
      { endAt: { gte: from, lte: to } },
      { AND: [{ startAt: { lte: from } }, { endAt: { gte: to } }] },
    ],
  };

  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    return {
      ...dateRange,
      ...(types && types.length ? { type: { in: types } } : {}),
    };
  }

  // Find profile ids + class memberships per role.
  let teacherProfileId: string | null = null;
  let studentProfileId: string | null = null;
  let classIds: string[] = [];
  let childClassIds: string[] = [];
  let childStudentIds: string[] = [];

  if (role === "TEACHER") {
    const t = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true, classes: { select: { id: true } } },
    });
    teacherProfileId = t?.id ?? null;
    classIds = (t?.classes ?? []).map((c) => c.id);
  } else if (role === "STUDENT") {
    const s = await prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        enrollments: {
          where: { status: "ACTIVE" },
          select: { classId: true },
        },
      },
    });
    studentProfileId = s?.id ?? null;
    classIds = (s?.enrollments ?? []).map((e) => e.classId);
  } else if (role === "PARENT") {
    const p = await prisma.parentProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        childLinks: {
          select: {
            studentId: true,
            student: {
              select: {
                enrollments: {
                  where: { status: "ACTIVE" },
                  select: { classId: true },
                },
              },
            },
          },
        },
      },
    });
    childStudentIds = (p?.childLinks ?? []).map((l) => l.studentId);
    childClassIds = (p?.childLinks ?? []).flatMap((l) =>
      l.student.enrollments.map((e) => e.classId)
    );
  }

  const audienceOr: Prisma.CalendarEventWhereInput[] = [
    { userId },
    { isGlobal: true },
    { audienceRole: role },
  ];
  if (teacherProfileId) {
    audienceOr.push({ teacherId: teacherProfileId });
  }
  if (studentProfileId) {
    audienceOr.push({ studentId: studentProfileId });
  }
  if (classIds.length) {
    audienceOr.push({ classId: { in: classIds } });
  }
  if (childClassIds.length) {
    audienceOr.push({ classId: { in: childClassIds } });
  }
  if (childStudentIds.length) {
    audienceOr.push({ studentId: { in: childStudentIds } });
  }

  return {
    ...dateRange,
    OR: audienceOr,
    ...(types && types.length ? { type: { in: types } } : {}),
  };
}

/** Return events visible to (userId, role) overlapping [from, to]. */
export async function getCalendarEvents(opts: GetEventsOpts): Promise<CalendarEvent[]> {
  const where = await buildWhere(opts);
  return prisma.calendarEvent.findMany({
    where,
    orderBy: { startAt: "asc" },
    take: 500,
  });
}

export interface CreateEventOpts {
  type: CalendarEventType;
  title: string;
  titleAr: string;
  description?: string;
  descriptionAr?: string;
  startAt: Date;
  endAt: Date;
  allDay?: boolean;
  userId?: string | null;
  classId?: string | null;
  teacherId?: string | null;
  studentId?: string | null;
  audienceRole?: Role | null;
  isGlobal?: boolean;
  metadata?: Prisma.InputJsonValue;
  createdBy: string;
}

/** Create a personal (per-user) event. */
export async function createPersonalEvent(
  opts: CreateEventOpts & { userId: string }
): Promise<CalendarEvent> {
  return prisma.calendarEvent.create({
    data: { ...opts, isGlobal: false },
  });
}

/** Create a global / audience-wide event. */
export async function createGlobalEvent(
  opts: Omit<CreateEventOpts, "userId"> & { isGlobal?: boolean }
): Promise<CalendarEvent> {
  return prisma.calendarEvent.create({
    data: { ...opts, isGlobal: opts.isGlobal ?? true },
  });
}

/** Can `role` modify the given event? */
export function canModifyEvent(
  event: { createdBy: string; isGlobal: boolean; audienceRole: Role | null },
  userId: string,
  role: Role
): boolean {
  if (role === "SUPER_ADMIN" || role === "ADMIN") return true;
  return event.createdBy === userId && !event.isGlobal && !event.audienceRole;
}

/**
 * Sprint 3 — Create or update a CalendarEvent for a ClassSession.
 *
 * Idempotent: if there is already a matching event (same class + startAt),
 * this updates it instead of creating a duplicate. Safe to call from
 * ClassSession create/update handlers.
 */
export async function upsertSessionCalendarEvent(opts: {
  sessionId: string;
  classId: string;
  className: string;
  classNameAr?: string | null;
  teacherId: string;
  scheduledDate: Date;
  durationMinutes: number;
  createdBy: string;
}): Promise<CalendarEvent> {
  const endAt = new Date(opts.scheduledDate.getTime() + opts.durationMinutes * 60 * 1000);
  const existing = await prisma.calendarEvent.findFirst({
    where: { type: "CLASS", classId: opts.classId, startAt: opts.scheduledDate },
    select: { id: true },
  });
  if (existing) {
    return prisma.calendarEvent.update({
      where: { id: existing.id },
      data: {
        title: opts.className,
        titleAr: opts.classNameAr ?? opts.className,
        endAt,
        teacherId: opts.teacherId,
        metadata: { sessionId: opts.sessionId },
      },
    });
  }
  return prisma.calendarEvent.create({
    data: {
      type: "CLASS",
      title: opts.className,
      titleAr: opts.classNameAr ?? opts.className,
      startAt: opts.scheduledDate,
      endAt,
      isGlobal: false,
      classId: opts.classId,
      teacherId: opts.teacherId,
      createdBy: opts.createdBy,
      metadata: { sessionId: opts.sessionId },
    },
  });
}
