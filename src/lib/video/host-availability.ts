/**
 * Zoom host availability — the real limit on simultaneous classes.
 *
 * A Zoom *account* can hold many users, but each licensed USER can host only
 * ONE meeting at a time (unless the account buys Zoom's "concurrent meetings"
 * add-on). So the unit of concurrency is the HOST EMAIL, not the ZoomAccount
 * row and not the teacher.
 *
 * If two teachers who share a host email start a class at the same moment,
 * Zoom ends the first meeting to start the second — students get dropped
 * mid-lesson with no explanation. These helpers let us refuse that up front
 * and show the clash on the admin schedule instead.
 */
import { prisma } from "@/lib/prisma";

/** A LIVE session older than this is treated as forgotten, not as occupying
 *  the host — otherwise one session left LIVE blocks the host forever. */
const STALE_LIVE_HOURS = 6;

export interface ZoomAccountRef {
  id?: string;
  label?: string;
  hostEmail: string | null;
  maxConcurrent?: number | null;
}

export interface ResolvedHost {
  /** Lower-cased host email, or "" when Zoom isn't configured at all. */
  hostEmail: string;
  /** Null means the shared "main connection" host from the environment. */
  accountLabel: string | null;
  maxConcurrent: number;
}

export function envHostEmail(): string {
  return (process.env.ZOOM_HOST_EMAIL ?? "").trim().toLowerCase();
}

/**
 * Which Zoom user will host for a teacher on this account.
 * Mirrors resolveZoomTarget()'s fallback so the guard and the actual meeting
 * creation can never disagree about who the host is.
 */
export function resolveHost(account: ZoomAccountRef | null | undefined): ResolvedHost {
  const own = account?.hostEmail?.trim().toLowerCase();
  if (own) {
    return {
      hostEmail: own,
      accountLabel: account?.label ?? null,
      maxConcurrent: Math.max(1, account?.maxConcurrent ?? 1),
    };
  }
  return { hostEmail: envHostEmail(), accountLabel: null, maxConcurrent: 1 };
}

export interface HostOccupant {
  kind: "class" | "private";
  sessionId: string;
  title: string;
  teacherName: string;
  startedAt: Date | null;
}

export interface HostAvailability {
  hostEmail: string;
  accountLabel: string | null;
  maxConcurrent: number;
  liveCount: number;
  available: boolean;
  occupants: HostOccupant[];
}

/**
 * Is this teacher's Zoom host free right now?
 *
 * `excludeSessionId` skips the session being started, so re-starting an
 * already-LIVE class never blocks itself.
 */
export async function checkHostAvailability(params: {
  account: ZoomAccountRef | null | undefined;
  excludeSessionId?: string;
  excludePrivateLessonId?: string;
}): Promise<HostAvailability> {
  const host = resolveHost(params.account);
  const base: HostAvailability = {
    ...host,
    liveCount: 0,
    available: true,
    occupants: [],
  };
  // Zoom isn't configured — nothing to protect, and the start route has its
  // own "not configured" path.
  if (!host.hostEmail) return base;

  const since = new Date(Date.now() - STALE_LIVE_HOURS * 60 * 60 * 1000);
  const teacherSelect = {
    user: { select: { name: true, nameAr: true } },
    zoomAccount: { select: { label: true, hostEmail: true, maxConcurrent: true } },
  } as const;

  const [liveClasses, livePrivate] = await Promise.all([
    prisma.classSession.findMany({
      where: {
        status: "LIVE",
        startedAt: { gte: since },
        ...(params.excludeSessionId ? { id: { not: params.excludeSessionId } } : {}),
      },
      select: {
        id: true,
        startedAt: true,
        class: {
          select: { name: true, nameAr: true, teacher: { select: teacherSelect } },
        },
      },
    }),
    prisma.privateLesson.findMany({
      where: {
        status: "LIVE",
        scheduledAt: { gte: since },
        ...(params.excludePrivateLessonId ? { id: { not: params.excludePrivateLessonId } } : {}),
      },
      select: {
        id: true,
        scheduledAt: true,
        student: { select: { user: { select: { name: true, nameAr: true } } } },
        teacher: { select: teacherSelect },
      },
    }),
  ]);

  const occupants: HostOccupant[] = [];
  for (const s of liveClasses) {
    if (resolveHost(s.class.teacher.zoomAccount).hostEmail !== host.hostEmail) continue;
    occupants.push({
      kind: "class",
      sessionId: s.id,
      title: s.class.nameAr ?? s.class.name,
      teacherName: s.class.teacher.user.nameAr ?? s.class.teacher.user.name,
      startedAt: s.startedAt,
    });
  }
  for (const p of livePrivate) {
    if (resolveHost(p.teacher.zoomAccount).hostEmail !== host.hostEmail) continue;
    occupants.push({
      kind: "private",
      sessionId: p.id,
      title: p.student.user.nameAr ?? p.student.user.name,
      teacherName: p.teacher.user.nameAr ?? p.teacher.user.name,
      startedAt: p.scheduledAt,
    });
  }

  return {
    ...base,
    liveCount: occupants.length,
    available: occupants.length < host.maxConcurrent,
    occupants,
  };
}

// ─────────────────────── Schedule clash detection ───────────────────────

export interface ScheduleClash {
  hostEmail: string;
  accountLabel: string | null;
  a: { sessionId: string; title: string; teacherName: string; start: Date; end: Date };
  b: { sessionId: string; title: string; teacherName: string; start: Date; end: Date };
}

/**
 * Upcoming class sessions that would collide on the same Zoom host.
 *
 * Two sessions clash when their time ranges overlap and more than
 * `maxConcurrent` of them land on one host email. Purely read-only —
 * used to warn the admin before the day arrives.
 */
export async function findUpcomingClashes(daysAhead = 30): Promise<ScheduleClash[]> {
  const now = new Date();
  const until = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const sessions = await prisma.classSession.findMany({
    where: {
      scheduledDate: { gte: now, lte: until },
      status: { notIn: ["CANCELLED", "COMPLETED"] },
    },
    select: {
      id: true,
      scheduledDate: true,
      class: {
        select: {
          name: true,
          nameAr: true,
          durationMinutes: true,
          teacher: {
            select: {
              user: { select: { name: true, nameAr: true } },
              zoomAccount: { select: { label: true, hostEmail: true, maxConcurrent: true } },
            },
          },
        },
      },
    },
    orderBy: { scheduledDate: "asc" },
    take: 2000,
  });

  type Item = ScheduleClash["a"] & { host: ResolvedHost };
  const strip = (it: Item): ScheduleClash["a"] => ({
    sessionId: it.sessionId,
    title: it.title,
    teacherName: it.teacherName,
    start: it.start,
    end: it.end,
  });
  const byHost = new Map<string, Item[]>();

  for (const s of sessions) {
    const host = resolveHost(s.class.teacher.zoomAccount);
    if (!host.hostEmail) continue;
    const start = s.scheduledDate;
    const end = new Date(start.getTime() + (s.class.durationMinutes ?? 60) * 60_000);
    const item: Item = {
      sessionId: s.id,
      title: s.class.nameAr ?? s.class.name,
      teacherName: s.class.teacher.user.nameAr ?? s.class.teacher.user.name,
      start,
      end,
      host,
    };
    byHost.set(host.hostEmail, [...(byHost.get(host.hostEmail) ?? []), item]);
  }

  const clashes: ScheduleClash[] = [];
  for (const [hostEmail, items] of byHost) {
    const limit = items[0]?.host.maxConcurrent ?? 1;
    items.sort((x, y) => x.start.getTime() - y.start.getTime());
    // Compare each session against the ones already running when it starts.
    for (let i = 0; i < items.length; i++) {
      const overlapping = items
        .slice(0, i)
        .filter((prev) => prev.end.getTime() > items[i].start.getTime());
      if (overlapping.length >= limit) {
        clashes.push({
          hostEmail,
          accountLabel: items[i].host.accountLabel,
          a: strip(overlapping[overlapping.length - 1]),
          b: strip(items[i]),
        });
      }
    }
  }
  return clashes;
}
