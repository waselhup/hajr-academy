"use client";

import { useTranslations } from "next-intl";

export function XpBar({
  xp,
  level,
  pct,
  tone = "default",
}: {
  xp: number;
  level: number;
  pct: number;
  tone?: "playful" | "game" | "default" | "mature";
}) {
  const t = useTranslations("Gamification");

  const styles = {
    playful: {
      bar: "h-5 rounded-full bg-gradient-to-r from-hajr-rose to-hajr-mint",
      track: "h-5 rounded-full bg-hajr-rose/10",
    },
    game: {
      bar: "h-4 rounded-full bg-gradient-to-r from-hajr-deep-navy to-hajr-rose",
      track: "h-4 rounded-full bg-slate-200",
    },
    default: {
      bar: "h-3 rounded-full bg-hajr-rose",
      track: "h-3 rounded-full bg-slate-200",
    },
    mature: {
      bar: "h-2 rounded-full bg-hajr-deep-navy",
      track: "h-2 rounded-full bg-slate-200",
    },
  } as const;
  const s = styles[tone];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-hajr-gray-600">
        <span>
          {t("level")} {level}
        </span>
        <span>{xp} XP</span>
      </div>
      <div className={s.track}>
        <div
          className={s.bar}
          style={{ width: `${pct}%`, transition: "width 0.6s ease" }}
        />
      </div>
    </div>
  );
}
