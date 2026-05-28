"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XpBar } from "./xp-bar";
import { StreakFlame } from "./streak-flame";
import { Trophy, Sparkles, Calendar } from "lucide-react";

type Profile = {
  ok: boolean;
  profile?: {
    xp: number;
    level: number;
    streakDays: number;
    ageTier: "TIER_1_3" | "TIER_4_6" | "MIDDLE" | "HIGH";
    avatarFrame: string;
    title: string;
  };
  progress?: { pct: number; current: number; next: number };
  achievements?: {
    earned: Array<{ id: string; key: string; iconKey: string; nameAr: string; nameEn: string }>;
  };
};

export function GamificationCard() {
  const t = useTranslations("Gamification");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [data, setData] = useState<Profile | null>(null);

  useEffect(() => {
    fetch("/api/student/gamification/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch(() => {});
  }, []);

  if (!data || !data.profile) return null;
  const p = data.profile;
  const earnedCount = data.achievements?.earned.length ?? 0;
  const unclaimed = data.achievements?.earned.filter((e) => !(e as { isClaimed?: boolean }).isClaimed).length ?? 0;

  if (p.ageTier === "TIER_1_3") return <PlayfulCard p={p} progress={data.progress!} earned={earnedCount} isAr={isAr} t={t} />;
  if (p.ageTier === "TIER_4_6") return <GameCard p={p} progress={data.progress!} earned={earnedCount} unclaimed={unclaimed} isAr={isAr} t={t} />;
  if (p.ageTier === "HIGH") return <MatureCard p={p} progress={data.progress!} earned={earnedCount} isAr={isAr} t={t} />;
  return <DefaultMiddleCard p={p} progress={data.progress!} earned={earnedCount} unclaimed={unclaimed} isAr={isAr} t={t} />;
}

type P = NonNullable<Profile["profile"]>;
type Pr = NonNullable<Profile["progress"]>;

function PlayfulCard({ p, progress, earned, isAr, t }: { p: P; progress: Pr; earned: number; isAr: boolean; t: (k: string) => string }) {
  return (
    <Card className="overflow-hidden border-2 border-hajr-rose/40 bg-gradient-to-br from-hajr-rose/10 to-hajr-mint/10">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-hajr-rose text-2xl text-white shadow-lg">
            ⭐
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wide text-hajr-rose">
              {isAr ? "نجمتي اللطيفة" : "My Bright Star"}
            </div>
            <div className="text-2xl font-bold text-hajr-deep-navy">
              {t("level")} {p.level} ✨
            </div>
          </div>
          <StreakFlame days={p.streakDays} big />
        </div>
        <div className="mt-4">
          <XpBar xp={p.xp} level={p.level} pct={progress.pct} tone="playful" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <BigTile icon="🎯" labelAr="نقاطي" labelEn="My points" value={p.xp} isAr={isAr} />
          <BigTile icon="🏆" labelAr="الكؤوس" labelEn="Trophies" value={earned} isAr={isAr} />
          <BigTile icon="🔥" labelAr="أيام متتالية" labelEn="Days streak" value={p.streakDays} isAr={isAr} />
        </div>
      </CardContent>
    </Card>
  );
}

function GameCard({ p, progress, earned, unclaimed, isAr, t }: { p: P; progress: Pr; earned: number; unclaimed: number; isAr: boolean; t: (k: string) => string }) {
  return (
    <Card className="overflow-hidden border-hajr-deep-navy/20 bg-gradient-to-br from-hajr-deep-navy/5 to-hajr-rose/5">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-hajr-deep-navy text-xl text-white">
              {p.level}
            </div>
            <div>
              <div className="text-xs text-hajr-rose">{t("explorerTitle")}</div>
              <div className="text-lg font-bold text-hajr-deep-navy">
                {t("level")} {p.level} {t("knight")}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StreakFlame days={p.streakDays} />
            {unclaimed > 0 && (
              <Badge variant="rose">
                <Sparkles className="me-1 h-3 w-3 inline" /> {unclaimed}
              </Badge>
            )}
          </div>
        </div>
        <div className="mt-3">
          <XpBar xp={p.xp} level={p.level} pct={progress.pct} tone="game" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <Tile label={t("xpLabel")} value={p.xp} />
          <Tile label={t("trophies")} value={earned} />
          <Tile label={t("streakLabel")} value={`${p.streakDays}d`} />
        </div>
      </CardContent>
    </Card>
  );
}

function DefaultMiddleCard({ p, progress, earned, unclaimed, isAr, t }: { p: P; progress: Pr; earned: number; unclaimed: number; isAr: boolean; t: (k: string) => string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-hajr-gray-500">{t("yourLevel")}</div>
            <div className="text-2xl font-bold text-hajr-deep-navy">
              {t("level")} {p.level}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StreakFlame days={p.streakDays} />
            <Badge variant="rose">{earned} <Trophy className="ms-1 inline h-3 w-3" /></Badge>
            {unclaimed > 0 && (
              <Badge variant="warning">
                <Sparkles className="me-1 inline h-3 w-3" />
                {unclaimed}
              </Badge>
            )}
          </div>
        </div>
        <div className="mt-3">
          <XpBar xp={p.xp} level={p.level} pct={progress.pct} tone="default" />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-hajr-gray-500">
          <span>{t("nextMilestone").replace("{n}", String(progress.next - p.xp))}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function MatureCard({ p, progress, earned, isAr, t }: { p: P; progress: Pr; earned: number; isAr: boolean; t: (k: string) => string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-hajr-gray-500">
              {t("certificateLevel")}
            </div>
            <div className="font-mono text-3xl font-semibold text-hajr-deep-navy">
              L{p.level}
            </div>
          </div>
          <div className="text-end">
            <div className="text-xs text-hajr-gray-500">{t("xpLabel")}</div>
            <div className="font-mono text-xl">{p.xp.toLocaleString()}</div>
          </div>
        </div>
        <div className="mt-3">
          <XpBar xp={p.xp} level={p.level} pct={progress.pct} tone="mature" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          <span>
            <span className="block text-hajr-gray-500">{t("streakLabel")}</span>
            <span className="font-mono text-base">{p.streakDays}d</span>
          </span>
          <span>
            <span className="block text-hajr-gray-500">{t("credentials")}</span>
            <span className="font-mono text-base">{earned}</span>
          </span>
          <Link href="./achievements" className="text-hajr-rose hover:underline">
            <span className="block">{t("viewDetails")}</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-white px-3 py-2 shadow-sm">
      <div className="text-[10px] text-hajr-gray-500">{label}</div>
      <div className="text-base font-bold text-hajr-deep-navy">{value}</div>
    </div>
  );
}

function BigTile({ icon, labelAr, labelEn, value, isAr }: { icon: string; labelAr: string; labelEn: string; value: number; isAr: boolean }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <div className="text-2xl">{icon}</div>
      <div className="text-lg font-bold text-hajr-deep-navy">{value}</div>
      <div className="text-[11px] text-hajr-gray-500">{isAr ? labelAr : labelEn}</div>
    </div>
  );
}
