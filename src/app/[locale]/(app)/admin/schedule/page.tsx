import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ScheduleClient } from "./_components/schedule-client";

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; teacher?: string; program?: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const sp = await searchParams;

  const refDate = sp.week ? new Date(sp.week) : new Date();
  // Compute Sunday-start week (Saudi week starts Sunday)
  const weekStart = new Date(refDate);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400_000);

  const where: any = { scheduledDate: { gte: weekStart, lt: weekEnd } };
  if (sp.teacher) where.class = { teacherId: sp.teacher };
  if (sp.program) where.class = { ...(where.class || {}), programId: sp.program };

  let sessionRows: any[] = [];
  let teacherList: any[] = [];
  let programList: any[] = [];
  let classList: any[] = [];

  try {
    const [sessions, teachers, programs, classes] = await Promise.all([
      prisma.classSession.findMany({
        where,
        include: {
          class: {
            include: {
              program: { select: { code: true, nameEn: true, nameAr: true } },
              teacher: { include: { user: { select: { name: true, nameAr: true } } } },
            },
          },
        },
        orderBy: { scheduledDate: "asc" },
      }),
      prisma.teacherProfile.findMany({ where: { active: true }, include: { user: { select: { name: true } } } }),
      prisma.program.findMany({ where: { active: true }, select: { id: true, code: true, nameEn: true } }),
      prisma.class.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, nameAr: true, cohortCode: true } }),
    ]);
    sessionRows = sessions.map((s) => ({
      id: s.id,
      classId: s.class.id,
      className: s.class.name,
      classNameAr: s.class.nameAr,
      cohortCode: s.class.cohortCode,
      teacherId: s.class.teacher.id,
      teacherName: s.class.teacher.user.name,
      programCode: s.class.program.code,
      scheduledDate: s.scheduledDate.toISOString(),
      durationMinutes: s.class.durationMinutes,
      status: s.status,
    }));
    teacherList = teachers.map((t) => ({ id: t.id, name: t.user.name }));
    programList = programs.map((p) => ({ id: p.id, code: p.code, nameEn: p.nameEn }));
    classList = classes.map((c) => ({ id: c.id, name: c.name, cohortCode: c.cohortCode }));
  } catch (e) {
    console.error("[admin-schedule] DB query failed:", e);
  }

  return (
    <ScheduleClient
      sessions={sessionRows}
      weekStart={weekStart.toISOString()}
      teachers={teacherList}
      programs={programList}
      classes={classList}
    />
  );
}
