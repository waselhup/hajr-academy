import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ensureSkillLevels } from "@/lib/lab/recommender";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtRiyadh } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * /teacher/lab/student/[studentId] — a student's lab progress: skill
 * levels, recent attempts, and the manual-review queue.
 */
export default async function TeacherStudentProgressPage({
  params,
}: {
  params: { studentId: string; locale: "ar" | "en" };
}) {
  await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Lab");
  const { locale } = params;

  let student: any = null;
  let skillLevels: any[] = [];
  let recentAttempts: any[] = [];

  try {
    student = await prisma.studentProfile.findUnique({
      where: { id: params.studentId },
      include: { user: { select: { name: true, nameAr: true } } },
    });
    if (!student) notFound();

    skillLevels = await ensureSkillLevels(student.id);

    const attempts = await prisma.labAttempt.findMany({
      where: { studentId: student.id, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 20,
      include: { exercise: { select: { title: true, titleAr: true, type: true } } },
    });
    recentAttempts = attempts.map((a) => ({
      id: a.id,
      title: a.exercise.titleAr ?? a.exercise.title,
      type: a.exercise.type,
      score: a.score != null ? Number(a.score) : null,
      completedAt: a.completedAt,
    }));
  } catch (e) {
    console.error("[teacher-student-progress] DB query failed:", e);
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {t("studentProgress")} — {student.user.nameAr ?? student.user.name}
      </h1>

      {/* Skill levels */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {skillLevels.map((l) => (
          <Card key={l.skill}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{l.skill}</span>
                <Badge variant="info">{l.currentLevel}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground num">
                {l.totalAttempts} {t("attempts")} · {l.totalPoints} {t("points")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("recentActivity")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentAttempts.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              {t("noExercises")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("exerciseTitle")}</TableHead>
                  <TableHead>{t("exerciseType")}</TableHead>
                  <TableHead>{t("score")}</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAttempts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.type}</Badge>
                    </TableCell>
                    <TableCell className="num">
                      {a.score != null ? `${Math.round(a.score)}%` : "—"}
                    </TableCell>
                    <TableCell className="num text-xs text-muted-foreground">
                      {a.completedAt
                        ? fmtRiyadh(a.completedAt, "yyyy-MM-dd")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
