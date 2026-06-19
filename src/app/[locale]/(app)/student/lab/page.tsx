import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ensureSkillLevels, recommendExercises, getDailyChallenge } from "@/lib/lab/recommender";
import { labAssignedWhereByClassIds } from "@/lib/lab/visibility";
import { Link } from "@/i18n/routing";
import { ClipboardList, CheckCircle2, Clock } from "lucide-react";
import { LabHubClient } from "./lab-hub-client";

export const dynamic = "force-dynamic";

/**
 * /student/lab — the English Lab hub: six skill cards, daily challenge,
 * recommendations, and recent activity.
 */
export default async function StudentLabPage() {
  const session = await requireRole("STUDENT");
  const t = await getTranslations("Lab");
  const isAr = (await getLocale()) === "ar";

  let skillLevels: any[] = [];
  let recommendations: any[] = [];
  let dailyChallenge: any = null;
  let recentActivity: any[] = [];
  let weekStats = { minutes: 0, completed: 0 };
  let assigned: any[] = [];

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (student) {
      const levels = await ensureSkillLevels(student.id);
      skillLevels = levels.map((l) => ({
        skill: l.skill,
        level: l.currentLevel,
        confidence: Number(l.confidence),
        totalAttempts: l.totalAttempts,
        totalPoints: l.totalPoints,
      }));

      recommendations = await recommendExercises(student.id, 4);
      dailyChallenge = await getDailyChallenge(student.id);

      const attempts = await prisma.labAttempt.findMany({
        where: { studentId: student.id, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 10,
        include: {
          exercise: { select: { title: true, titleAr: true, type: true } },
        },
      });
      recentActivity = attempts.map((a) => ({
        id: a.id,
        exerciseId: a.exerciseId,
        title: a.exercise.titleAr ?? a.exercise.title,
        type: a.exercise.type,
        score: a.score != null ? Number(a.score) : null,
        completedAt: a.completedAt?.toISOString() ?? null,
      }));

      // This week's stats.
      const weekAgo = new Date(Date.now() - 7 * 86400_000);
      const weekAttempts = await prisma.labAttempt.findMany({
        where: {
          studentId: student.id,
          status: "COMPLETED",
          completedAt: { gte: weekAgo },
        },
        select: { timeSpentSec: true },
      });
      weekStats = {
        minutes: Math.round(
          weekAttempts.reduce((s, a) => s + a.timeSpentSec, 0) / 60
        ),
        completed: weekAttempts.length,
      };

      // Lab Studio v2 — exercises a teacher assigned to this student / their class.
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: student.id, status: "ACTIVE" },
        select: { classId: true },
      });
      const classIds = enrollments.map((e) => e.classId);
      if (classIds.length) {
        const rows = await prisma.labExercise.findMany({
          where: labAssignedWhereByClassIds(classIds, student.id),
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          take: 20,
          include: { attempts: { where: { studentId: student.id }, select: { status: true, score: true }, orderBy: { startedAt: "desc" }, take: 1 } },
        });
        assigned = rows.map((e) => ({
          id: e.id,
          title: isAr ? e.titleAr : e.title,
          type: e.type,
          level: e.level,
          dueDate: e.dueDate ? e.dueDate.toISOString() : null,
          done: e.attempts[0]?.status === "COMPLETED",
          score: e.attempts[0]?.score != null ? Number(e.attempts[0].score) : null,
        }));
      }
    }
  } catch (e) {
    console.error("[student-lab] DB query failed:", e);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("hubTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("hubSubtitle")}</p>
      </div>

      {assigned.length > 0 && (
        <section className="space-y-3 rounded-card border border-hajr-border bg-white p-4 shadow-card">
          <div className="flex items-center gap-2">
            <span className="icon-chip h-8 w-8"><ClipboardList className="h-4 w-4" /></span>
            <h2 className="text-base font-semibold text-hajr-deep-navy">{isAr ? "مُسنَد إليك" : "Assigned to you"}</h2>
            <span className="num rounded-full bg-hajr-rose/10 px-2 py-0.5 text-xs font-medium text-hajr-rose">{assigned.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {assigned.map((a) => (
              <Link key={a.id} href={`/student/lab/exercise/${a.id}`}
                className="subrow flex items-center justify-between gap-3 transition-colors hover:bg-hajr-chip">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-hajr-deep-navy">{a.title}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{a.type} · {a.level}</span>
                    {a.dueDate && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(a.dueDate).toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-GB")}</span>}
                  </p>
                </div>
                {a.done ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-hajr-success"><CheckCircle2 className="h-4 w-4" />{a.score != null ? <span className="num">{a.score}%</span> : (isAr ? "تم" : "Done")}</span>
                ) : (
                  <span className="shrink-0 rounded-lg bg-hajr-rose px-3 py-1 text-xs font-medium text-white">{isAr ? "ابدأ" : "Start"}</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <LabHubClient
        skillLevels={skillLevels}
        recommendations={recommendations}
        dailyChallenge={dailyChallenge}
        recentActivity={recentActivity}
        weekStats={weekStats}
      />
    </div>
  );
}
