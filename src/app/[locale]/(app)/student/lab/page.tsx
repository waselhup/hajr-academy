import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ensureSkillLevels, recommendExercises, getDailyChallenge } from "@/lib/lab/recommender";
import { LabHubClient } from "./lab-hub-client";

export const dynamic = "force-dynamic";

/**
 * /student/lab — the English Lab hub: six skill cards, daily challenge,
 * recommendations, and recent activity.
 */
export default async function StudentLabPage() {
  const session = await requireRole("STUDENT");
  const t = await getTranslations("Lab");

  let skillLevels: any[] = [];
  let recommendations: any[] = [];
  let dailyChallenge: any = null;
  let recentActivity: any[] = [];
  let weekStats = { minutes: 0, completed: 0 };

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
