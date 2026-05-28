"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AchievementCard } from "@/components/gamification/achievement-card";
import { toast } from "sonner";

type Ach = {
  id: string;
  key: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  iconKey: string;
  xpReward: number;
  category: string;
  earned: boolean;
  unclaimed: boolean;
};

const VARIANT_BY_TIER: Record<string, "playful" | "game" | "default" | "mature"> = {
  TIER_1_3: "playful",
  TIER_4_6: "game",
  MIDDLE: "default",
  HIGH: "mature",
};

export function AchievementsClient({
  ageTier,
  achievements,
}: {
  ageTier: string;
  achievements: Ach[];
}) {
  const t = useTranslations("Gamification");
  const [list, setList] = useState(achievements);
  const variant = VARIANT_BY_TIER[ageTier] ?? "default";

  const byCategory = useMemo(() => {
    const m = new Map<string, Ach[]>();
    for (const a of list) {
      if (!m.has(a.category)) m.set(a.category, []);
      m.get(a.category)!.push(a);
    }
    return Array.from(m.entries());
  }, [list]);

  async function claimAll() {
    const unclaimed = list.filter((a) => a.unclaimed);
    if (unclaimed.length === 0) return;
    for (const a of unclaimed) {
      await fetch(`/api/student/achievements/${a.id}/claim`, { method: "POST" }).catch(() => {});
    }
    setList((s) => s.map((a) => (a.unclaimed ? { ...a, unclaimed: false } : a)));
    toast.success(t("allClaimed"));
  }

  const totalEarned = list.filter((a) => a.earned).length;
  const totalUnclaimed = list.filter((a) => a.unclaimed).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs text-hajr-gray-500">{t("totalEarned")}</div>
            <div className="text-2xl font-bold text-hajr-deep-navy">
              {totalEarned} / {list.length}
            </div>
          </div>
          {totalUnclaimed > 0 && (
            <Button onClick={claimAll} className="bg-hajr-rose text-white hover:bg-hajr-rose/90">
              {t("claimAll")} ({totalUnclaimed})
            </Button>
          )}
        </CardContent>
      </Card>

      {byCategory.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-hajr-gray-500">
            {t("noAchievements")}
          </CardContent>
        </Card>
      )}

      {byCategory.map(([cat, items]) => (
        <div key={cat} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase text-hajr-rose">
            {t(`cat_${cat}` as never)}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <AchievementCard
                key={a.id}
                iconKey={a.iconKey}
                nameAr={a.nameAr}
                nameEn={a.nameEn}
                descriptionAr={a.descriptionAr}
                descriptionEn={a.descriptionEn}
                xp={a.xpReward}
                earned={a.earned}
                isClaimed={!a.unclaimed}
                variant={variant}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
