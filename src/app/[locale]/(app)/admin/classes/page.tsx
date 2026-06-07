import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ClassesTabs } from "./_components/classes-tabs";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function AdminClassesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    program?: string;
    teacher?: string;
    gender?: string;
    day?: string;
    page?: string;
  }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const q = (sp.q ?? "").trim();

  const where: any = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { nameAr: { contains: q, mode: "insensitive" } },
      { cohortCode: { contains: q, mode: "insensitive" } },
    ];
  }
  if (sp.status) where.status = sp.status;
  if (sp.program) where.programId = sp.program;
  if (sp.teacher) where.teacherId = sp.teacher;
  if (sp.gender) where.genderRestriction = sp.gender;
  if (sp.day) where.scheduleDays = { has: sp.day };

  let total = 0;
  let classRows: any[] = [];
  let programs: any[] = [];
  let teachers: any[] = [];

  try {
    const [_total, rows, _programs, _teachers] = await Promise.all([
      prisma.class.count({ where }),
      prisma.class.findMany({
        where,
        include: {
          program: true,
          teacher: { include: { user: { select: { name: true, nameAr: true } } } },
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.program.findMany({
        where: { active: true },
        select: { id: true, code: true, nameEn: true, nameAr: true, defaultPriceSar: true },
      }),
      prisma.teacherProfile.findMany({
        where: { active: true },
        include: { user: { select: { name: true, nameAr: true } } },
      }),
    ]);
    total = _total;
    programs = _programs;
    teachers = _teachers;
    classRows = rows.map((c) => ({
      id: c.id,
      name: c.name,
      nameAr: c.nameAr,
      cohortCode: c.cohortCode,
      status: c.status,
      scheduleDays: c.scheduleDays,
      timeSlot: c.timeSlot,
      durationMinutes: c.durationMinutes,
      maxStudents: c.maxStudents,
      genderRestriction: c.genderRestriction,
      pricePerMonth: c.pricePerMonth.toString(),
      startDate: c.startDate.toISOString().slice(0, 10),
      endDate: c.endDate?.toISOString().slice(0, 10) ?? null,
      enrolled: c._count.enrollments,
      program: {
        id: c.program.id,
        code: c.program.code,
        name: c.program.nameEn,
        nameAr: c.program.nameAr,
      },
      teacher: {
        id: c.teacher.id,
        name: c.teacher.user.name,
        nameAr: c.teacher.user.nameAr,
      },
    }));
  } catch (e) {
    console.error("[admin-classes] DB query failed:", e);
  }

  return (
    <ClassesTabs
      classRows={classRows}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      programs={programs.map((p) => ({
        id: p.id,
        code: p.code,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        defaultPriceSar: p.defaultPriceSar.toString(),
      }))}
      teachers={teachers.map((t) => ({
        id: t.id,
        name: t.user.name,
        nameAr: t.user.nameAr,
      }))}
    />
  );
}
