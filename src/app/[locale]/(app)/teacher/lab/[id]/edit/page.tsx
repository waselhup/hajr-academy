import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getLocale } from "next-intl/server";
import { ExerciseBuilder } from "@/components/lab/exercise-builder";
import { isBlockContent } from "@/lib/lab/blocks";

export const dynamic = "force-dynamic";

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
  return { classes: classes.map((c) => ({ id: c.id, label: c.cohortCode ? `${c.name} (${c.cohortCode})` : c.name })), classStudents };
}

export default async function TeacherLabEditPage({ params }: { params: { id: string; locale: string } }) {
  const session = await requireRole("TEACHER");
  const locale = await getLocale();
  const isAr = locale === "ar";

  const ex = await prisma.labExercise.findUnique({ where: { id: params.id } });
  if (!ex) notFound();
  if (ex.createdBy && ex.createdBy !== session.user.id) redirect(`/${locale}/teacher/lab`);
  if (!isBlockContent(ex.content)) redirect(`/${locale}/teacher/lab`); // legacy exercise — not editable in Studio

  const targets = await prisma.labExerciseTarget.findMany({ where: { exerciseId: ex.id }, select: { studentId: true } });
  const { classes, classStudents } = await teacherClasses(session.user.id);

  const existing = {
    id: ex.id, type: ex.type, level: ex.level, title: ex.title, titleAr: ex.titleAr,
    instructions: (ex.content as any).instructions ?? "",
    blocks: (ex.content as any).blocks ?? [],
    audience: ex.audience, classId: ex.classId ?? "",
    studentIds: targets.map((t) => t.studentId), dueDate: "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold text-hajr-deep-navy">{isAr ? "تعديل التمرين" : "Edit exercise"}</h1>
      <ExerciseBuilder mode="edit" existing={existing} classes={classes} classStudents={classStudents} backHref="/teacher/lab" />
    </div>
  );
}
