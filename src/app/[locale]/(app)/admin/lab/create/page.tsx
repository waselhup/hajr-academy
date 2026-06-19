import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getLocale } from "next-intl/server";
import { ExerciseBuilder } from "@/components/lab/exercise-builder";

export const dynamic = "force-dynamic";

export default async function AdminLabCreatePage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const isAr = (await getLocale()) === "ar";

  let classes: { id: string; label: string }[] = [];
  const classStudents: Record<string, { id: string; name: string }[]> = {};
  try {
    const rows = await prisma.class.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true, name: true, cohortCode: true,
        enrollments: { where: { status: "ACTIVE" }, select: { student: { select: { id: true, user: { select: { name: true, nameAr: true } } } } } },
      },
      orderBy: { name: "asc" },
      take: 300,
    });
    classes = rows.map((c) => ({ id: c.id, label: c.cohortCode ? `${c.name} (${c.cohortCode})` : c.name }));
    for (const c of rows) classStudents[c.id] = c.enrollments.map((e) => ({ id: e.student.id, name: e.student.user.nameAr || e.student.user.name }));
  } catch (e) {
    console.error("[admin-lab-create] query failed:", e);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold text-hajr-deep-navy">{isAr ? "تمرين جديد في المعمل" : "New Lab exercise"}</h1>
      <ExerciseBuilder mode="create" classes={classes} classStudents={classStudents} backHref="/admin/lab/exercises" />
    </div>
  );
}
