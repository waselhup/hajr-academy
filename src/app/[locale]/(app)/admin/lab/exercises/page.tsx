import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminLabClient } from "./admin-lab-client";

export const dynamic = "force-dynamic";

/**
 * /admin/lab/exercises — system-wide English Lab content management.
 */
export default async function AdminLabExercisesPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Lab");

  let exercises: any[] = [];
  let stats = { total: 0, published: 0, attempts: 0 };

  try {
    const [rows, total, published, attempts] = await Promise.all([
      prisma.labExercise.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { _count: { select: { attempts: true } } },
      }),
      prisma.labExercise.count(),
      prisma.labExercise.count({ where: { isPublished: true } }),
      prisma.labAttempt.count(),
    ]);

    exercises = rows.map((e) => ({
      id: e.id,
      type: e.type,
      level: e.level,
      title: e.title,
      titleAr: e.titleAr,
      isPublished: e.isPublished,
      attempts: e._count.attempts,
      createdAt: e.createdAt.toISOString(),
    }));
    stats = { total, published, attempts };
  } catch (e) {
    console.error("[admin-lab-exercises] DB query failed:", e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("adminExercises")}</h1>
      <AdminLabClient exercises={exercises} stats={stats} />
    </div>
  );
}
