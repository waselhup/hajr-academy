import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getLocale } from "next-intl/server";
import { ExerciseBuilder } from "@/components/lab/exercise-builder";

export const dynamic = "force-dynamic";

/** Load the teacher's ACTIVE classes + rosters for the builder's scope picker. */
async function teacherClasses(userId: string) {
  const tp = await prisma.teacherProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!tp) return { classes: [] as any[], classStudents: {} as Record<string, any[]> };
  const classes = await prisma.class.findMany({
    where: { teacherId: tp.id, status: "ACTIVE" },
    select: {
      id: true, name: true, cohortCode: true,
      enrollments: { where: { status: "ACTIVE" }, select: { student: { select: { id: true, user: { select: { name: true, nameAr: true } } } } } },
    },
    orderBy: { name: "asc" },
  });
  const classStudents: Record<string, { id: string; name: string }[]> = {};
  for (const c of classes) classStudents[c.id] = c.enrollments.map((e) => ({ id: e.student.id, name: e.student.user.nameAr || e.student.user.name }));
  return {
    classes: classes.map((c) => ({ id: c.id, label: c.cohortCode ? `${c.name} (${c.cohortCode})` : c.name })),
    classStudents,
  };
}

export default async function TeacherLabCreatePage({ params }: { params: { locale: string } }) {
  const session = await requireRole("TEACHER");
  const locale = await getLocale();
  const { classes, classStudents } = await teacherClasses(session.user.id);
  const isAr = locale === "ar";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold text-hajr-deep-navy">{isAr ? "تمرين جديد في المعمل" : "New Lab exercise"}</h1>
      <ExerciseBuilder mode="create" classes={classes} classStudents={classStudents} backHref="/teacher/lab" />
    </div>
  );
}
