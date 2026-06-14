import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AttendanceClient, type AttendanceRow } from "./_components/attendance-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type StatusKey = "present" | "late" | "absent" | "excused";

/**
 * Admin "Attendance" page — a single all-students overview.
 *
 * The old nav target was a stub that redirected to /admin/classes?tab=attendance,
 * but that tab was removed (owner batch 4A), so the redirect landed nowhere. This
 * replaces it with a real, filterable per-student attendance table.
 *
 * Data is aggregated with TWO groupBy queries (not N+1): one per-student status
 * breakdown and one overall breakdown for the KPI cards. Rate convention matches
 * the rest of the platform: (PRESENT + LATE) / total marked.
 */
export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    classId?: string;
    from?: string;
    to?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  // Guard ABOVE any try so the NEXT_REDIRECT for an unauth/wrong-role caller
  // propagates instead of being swallowed into a 500 (house rule).
  await requireRole("ADMIN", "SUPER_ADMIN");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const classId = sp.classId?.trim() || undefined;
  const from = sp.from?.trim() || undefined; // canonical yyyy-mm-dd from <DateField>
  const to = sp.to?.trim() || undefined;
  const sort: "name" | "rate" = sp.sort === "name" ? "name" : "rate";
  const dir: "asc" | "desc" = sp.dir === "desc" ? "desc" : "asc";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  // Date bounds on ClassSession.scheduledDate: [from 00:00, to+1day 00:00).
  const gte = from ? new Date(`${from}T00:00:00`) : undefined;
  let lt: Date | undefined;
  if (to) {
    const d = new Date(`${to}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      d.setDate(d.getDate() + 1);
      lt = d;
    }
  }
  const dateRange =
    (gte && !Number.isNaN(gte.getTime())) || lt
      ? { ...(gte && !Number.isNaN(gte.getTime()) ? { gte } : {}), ...(lt ? { lt } : {}) }
      : undefined;

  // Session filter shared by attendance + session-count queries.
  const sessionWhere: { scheduledDate?: typeof dateRange; classId?: string } = {};
  if (dateRange) sessionWhere.scheduledDate = dateRange;
  if (classId) sessionWhere.classId = classId;
  const hasSessionFilter = Object.keys(sessionWhere).length > 0;
  const attendanceWhere = hasSessionFilter ? { session: sessionWhere } : {};

  // Student list filter (search + class membership).
  const studentWhere: {
    user?: { OR: Array<Record<string, unknown>> };
    enrollments?: { some: { classId: string; status: "ACTIVE" } };
  } = {};
  if (q) {
    studentWhere.user = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { nameAr: { contains: q, mode: "insensitive" } },
      ],
    };
  }
  if (classId) studentWhere.enrollments = { some: { classId, status: "ACTIVE" } };

  let rows: AttendanceRow[] = [];
  let total = 0;
  let classOptions: { id: string; name: string; nameAr: string | null }[] = [];
  const kpi = {
    sessions: 0,
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    totalMarked: 0,
    rate: null as number | null,
  };

  try {
    const [students, statusCounts, overallCounts, sessionCount, classes] = await Promise.all([
      // All matching students (minimal fields) — bounded by school scale; we need
      // the full set to sort by computed rate before paginating.
      prisma.studentProfile.findMany({
        where: studentWhere as never,
        select: {
          id: true,
          user: { select: { name: true, nameAr: true, avatar: true } },
          enrollments: {
            where: { status: "ACTIVE" },
            take: 1,
            orderBy: { enrolledAt: "desc" },
            select: { class: { select: { name: true, nameAr: true } } },
          },
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
        },
      }),
      // Per-student status breakdown in ONE query.
      prisma.attendance.groupBy({
        by: ["studentId", "status"],
        where: attendanceWhere as never,
        _count: { _all: true },
      }),
      // Overall breakdown for the KPI cards.
      prisma.attendance.groupBy({
        by: ["status"],
        where: attendanceWhere as never,
        _count: { _all: true },
      }),
      prisma.classSession.count({ where: sessionWhere as never }),
      prisma.class.findMany({
        select: { id: true, name: true, nameAr: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    classOptions = classes;

    const byStudent = new Map<
      string,
      { present: number; late: number; absent: number; excused: number; total: number }
    >();
    for (const r of statusCounts) {
      const m =
        byStudent.get(r.studentId) ?? { present: 0, late: 0, absent: 0, excused: 0, total: 0 };
      const n = r._count._all;
      m[r.status.toLowerCase() as StatusKey] += n;
      m.total += n;
      byStudent.set(r.studentId, m);
    }

    for (const r of overallCounts) {
      const n = r._count._all;
      kpi[r.status.toLowerCase() as StatusKey] += n;
      kpi.totalMarked += n;
    }
    kpi.sessions = sessionCount;
    kpi.rate =
      kpi.totalMarked > 0
        ? Math.round(((kpi.present + kpi.late) / kpi.totalMarked) * 1000) / 10
        : null;

    const allRows: AttendanceRow[] = students.map((s) => {
      const c = byStudent.get(s.id) ?? { present: 0, late: 0, absent: 0, excused: 0, total: 0 };
      const rate =
        c.total > 0 ? Math.round(((c.present + c.late) / c.total) * 1000) / 10 : null;
      const primary = s.enrollments[0]?.class ?? null;
      return {
        studentId: s.id,
        name: s.user.name,
        nameAr: s.user.nameAr,
        avatar: s.user.avatar,
        className: primary?.name ?? null,
        classNameAr: primary?.nameAr ?? null,
        classes: s._count.enrollments,
        present: c.present,
        late: c.late,
        absent: c.absent,
        excused: c.excused,
        total: c.total,
        rate,
      };
    });

    // Sort. Default: lowest rate first (surfaces attendance problems for admins);
    // null rates (no records) always sink to the bottom regardless of direction.
    const factor = dir === "asc" ? 1 : -1;
    allRows.sort((a, b) => {
      if (sort === "name") return factor * a.name.localeCompare(b.name);
      if (a.rate == null && b.rate == null) return a.name.localeCompare(b.name);
      if (a.rate == null) return 1;
      if (b.rate == null) return -1;
      if (a.rate === b.rate) return a.name.localeCompare(b.name);
      return factor * (a.rate - b.rate);
    });

    total = allRows.length;
    const skip = (page - 1) * PAGE_SIZE;
    rows = allRows.slice(skip, skip + PAGE_SIZE);
  } catch (e) {
    console.error("[admin-attendance] DB query failed:", e);
  }

  return (
    <AttendanceClient
      rows={rows}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      kpi={kpi}
      classOptions={classOptions}
      filters={{ q, classId: classId ?? "", from: from ?? "", to: to ?? "", sort, dir }}
    />
  );
}
