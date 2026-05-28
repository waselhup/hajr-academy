import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { computeAgeTier } from "@/lib/gamification/xp";
import { AchievementsClient } from "./_components/achievements-client";

export const dynamic = "force-dynamic";

export default async function StudentAchievementsPage() {
  const session = await requireRole("STUDENT");
  const t = await getTranslations("Gamification");

  const sp = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, birthDate: true, gradeLevel: true },
  });
  const ageTier = sp ? computeAgeTier(sp.birthDate, sp.gradeLevel) : "MIDDLE";

  // Pull all achievements + earned status
  let earnedIds = new Set<string>();
  let unclaimed = new Set<string>();
  let all: Awaited<ReturnType<typeof prisma.achievement.findMany>> = [];
  if (sp) {
    const [earned, achievements] = await Promise.all([
      prisma.studentAchievement.findMany({
        where: { studentId: sp.id },
        select: { achievementId: true, isClaimed: true },
      }),
      prisma.achievement.findMany({
        where: { isActive: true, OR: [{ ageTier: null }, { ageTier }] },
        orderBy: [{ category: "asc" }, { xpReward: "asc" }],
      }),
    ]);
    earnedIds = new Set(earned.map((e) => e.achievementId));
    unclaimed = new Set(earned.filter((e) => !e.isClaimed).map((e) => e.achievementId));
    all = achievements;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hajr-deep-navy">{t("achievementsTitle")}</h1>
        <p className="text-sm text-hajr-gray-500">{t("achievementsSubtitle")}</p>
      </div>
      <AchievementsClient
        ageTier={ageTier}
        achievements={all.map((a) => ({
          id: a.id,
          key: a.key,
          nameAr: a.nameAr,
          nameEn: a.nameEn,
          descriptionAr: a.descriptionAr,
          descriptionEn: a.descriptionEn,
          iconKey: a.iconKey,
          xpReward: a.xpReward,
          category: a.category,
          earned: earnedIds.has(a.id),
          unclaimed: unclaimed.has(a.id),
        }))}
      />
    </div>
  );
}
