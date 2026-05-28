"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Award,
  Trophy,
  Star,
  Sparkles,
  Mountain,
  Flame,
  Wand,
  Rocket,
  ClipboardCheck,
  Crown,
  Compass,
  Heart,
  Pen,
  Mic,
  Ear,
  BookOpen,
  Book,
  BookCheck,
  Calendar,
  GraduationCap,
  Library as LibraryIcon,
  Palette,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  award: Award,
  trophy: Trophy,
  star: Star,
  sparkle: Sparkles,
  mountain: Mountain,
  flame: Flame,
  wand: Wand,
  rocket: Rocket,
  "clipboard-check": ClipboardCheck,
  crown: Crown,
  compass: Compass,
  heart: Heart,
  pen: Pen,
  mic: Mic,
  ear: Ear,
  "book-open": BookOpen,
  book: Book,
  "book-check": BookCheck,
  "calendar-check": Calendar,
  graduation: GraduationCap,
  library: LibraryIcon,
  palette: Palette,
};

export function AchievementCard({
  iconKey,
  nameAr,
  nameEn,
  descriptionAr,
  descriptionEn,
  xp,
  earned,
  isClaimed,
  variant = "default",
}: {
  iconKey: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  xp: number;
  earned: boolean;
  isClaimed?: boolean;
  variant?: "playful" | "game" | "default" | "mature";
}) {
  const locale = useLocale();
  const t = useTranslations("Gamification");
  const isAr = locale === "ar";
  const Icon = ICONS[iconKey] ?? Award;

  const cardClass =
    variant === "playful"
      ? "rounded-2xl border-2 p-4"
      : variant === "game"
      ? "rounded-xl border p-4"
      : variant === "mature"
      ? "rounded-md border p-3"
      : "rounded-lg border p-3";

  return (
    <div
      className={`${cardClass} ${
        earned
          ? "border-hajr-rose/50 bg-white"
          : "border-hajr-gray-200 bg-hajr-gray-50 opacity-60"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            earned ? "bg-hajr-rose/20 text-hajr-rose" : "bg-hajr-gray-200 text-hajr-gray-400"
          } ${earned && !isClaimed ? "animate-pulse" : ""}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-hajr-deep-navy">
            {isAr ? nameAr : nameEn}
          </div>
          <div className="text-xs text-hajr-gray-500">
            {isAr ? descriptionAr : descriptionEn}
          </div>
        </div>
        <div className="text-xs font-semibold text-hajr-rose">+{xp}</div>
      </div>
      {earned && !isClaimed && (
        <div className="mt-2 text-center text-xs text-hajr-rose">
          {t("newUnlock")}
        </div>
      )}
    </div>
  );
}
