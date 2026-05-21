import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

/**
 * /admin/exams — mock-exam management with per-exam attempt statistics.
 */
export default async function AdminExamsPage({
  params,
}: {
  params: { locale: "ar" | "en" };
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Exam");
  const { locale } = params;

  let exams: any[] = [];
  let inProgress = 0;

  try {
    const rows = await prisma.testExam.findMany({
      orderBy: { createdAt: "asc" },
    });

    const completed = await prisma.examAttempt.findMany({
      where: { status: "COMPLETED" },
      select: { examId: true, totalScore: true, passed: true },
    });
    inProgress = await prisma.examAttempt.count({
      where: { status: "IN_PROGRESS" },
    });

    const perExam = new Map<
      string,
      { count: number; scoreSum: number; passCount: number }
    >();
    for (const a of completed) {
      const agg = perExam.get(a.examId) ?? {
        count: 0,
        scoreSum: 0,
        passCount: 0,
      };
      agg.count += 1;
      agg.scoreSum += Number(a.totalScore ?? 0);
      if (a.passed) agg.passCount += 1;
      perExam.set(a.examId, agg);
    }

    exams = rows.map((e) => {
      const agg = perExam.get(e.id);
      return {
        id: e.id,
        title: locale === "ar" ? e.titleAr : e.title,
        type: e.type,
        totalQuestions: e.totalQuestions,
        totalMinutes: e.totalMinutes,
        passingScore: e.passingScore,
        isPublished: e.isPublished,
        attempts: agg?.count ?? 0,
        avgScore:
          agg && agg.count > 0
            ? Math.round((agg.scoreSum / agg.count) * 100) / 100
            : null,
        passRate:
          agg && agg.count > 0
            ? Math.round((agg.passCount / agg.count) * 10000) / 100
            : null,
      };
    });
  } catch (e) {
    console.error("[admin-exams] DB query failed:", e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("manageExams")}</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold num">{exams.length}</div>
            <div className="text-xs text-muted-foreground">{t("manageExams")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold num">
              {exams.reduce((s, e) => s + e.attempts, 0)}
            </div>
            <div className="text-xs text-muted-foreground">{t("results")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold num">{inProgress}</div>
            <div className="text-xs text-muted-foreground">{t("inProgress")}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("title")}</TableHead>
                <TableHead>{t("section")}</TableHead>
                <TableHead>{t("questions")}</TableHead>
                <TableHead>{t("results")}</TableHead>
                <TableHead>{t("overallScore")}</TableHead>
                <TableHead>{t("passed")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="p-6 text-center text-muted-foreground"
                  >
                    {t("noExams")}
                  </TableCell>
                </TableRow>
              ) : (
                exams.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.type}</Badge>
                    </TableCell>
                    <TableCell className="num">{e.totalQuestions}</TableCell>
                    <TableCell className="num">{e.attempts}</TableCell>
                    <TableCell className="num">
                      {e.avgScore != null ? `${e.avgScore}%` : "—"}
                    </TableCell>
                    <TableCell>
                      {e.passRate != null ? (
                        <Badge
                          variant={e.passRate >= 50 ? "success" : "warning"}
                          className="num"
                        >
                          {e.passRate}%
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
