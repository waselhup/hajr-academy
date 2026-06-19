import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TeacherLabClient } from "./teacher-lab-client";

export const dynamic = "force-dynamic";

/**
 * /teacher/lab — the teacher's English Lab dashboard: their own exercises,
 * the public library, and a quick create flow.
 */
export default async function TeacherLabPage() {
  const session = await requireRole("TEACHER");
  const t = await getTranslations("Lab");
  const isAr = (await getLocale()) === "ar";

  let myExercises: any[] = [];
  let libraryExercises: any[] = [];

  try {
    const [mine, library] = await Promise.all([
      prisma.labExercise.findMany({
        where: { createdBy: session.user.id },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { attempts: true } } },
      }),
      prisma.labExercise.findMany({
        where: { isPublished: true },
        orderBy: { updatedAt: "desc" },
        take: 50,
        include: { _count: { select: { attempts: true } } },
      }),
    ]);

    const shape = (e: any) => ({
      id: e.id,
      type: e.type,
      level: e.level,
      title: e.title,
      titleAr: e.titleAr,
      isPublished: e.isPublished,
      attempts: e._count.attempts,
    });
    myExercises = mine.map(shape);
    libraryExercises = library.map(shape);
  } catch (e) {
    console.error("[teacher-lab] DB query failed:", e);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("teacherDashboard")}</h1>
        <Button asChild variant="cta" size="sm">
          <Link href="/teacher/lab/create"><Plus className="me-2 h-4 w-4" />{isAr ? "تمرين جديد" : "New exercise"}</Link>
        </Button>
      </div>
      <TeacherLabClient
        myExercises={myExercises}
        libraryExercises={libraryExercises}
      />
    </div>
  );
}
