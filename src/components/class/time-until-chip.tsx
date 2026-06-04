"use client";

/**
 * "Starts in 15 min" countdown chip. AR uses Arabic-Indic digits.
 * Updates every 30 seconds. Once start ≤ now, switches to "Live" badge.
 */
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

interface Props {
  startAt: Date | string;
  className?: string;
  liveLabel?: string;
}

export function TimeUntilChip({ startAt, className, liveLabel }: Props) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const start = new Date(startAt).getTime();
  const diff = start - Date.now();
  const mins = Math.round(diff / 60_000);

  if (diff <= 0) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700", className)}>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        {liveLabel ?? (isAr ? "مباشر" : "Live")}
      </span>
    );
  }

  let label: string;
  if (mins < 60) {
    const n = isAr ? mins.toLocaleString("ar-EG-u-nu-latn") : String(mins);
    label = isAr ? `يبدأ بعد ${n} دقيقة` : `Starts in ${n} min`;
  } else if (mins < 60 * 24) {
    const hrs = Math.round(mins / 60);
    const n = isAr ? hrs.toLocaleString("ar-EG-u-nu-latn") : String(hrs);
    label = isAr ? `يبدأ بعد ${n} ساعة` : `Starts in ${n} hr`;
  } else {
    const days = Math.round(mins / (60 * 24));
    const n = isAr ? days.toLocaleString("ar-EG-u-nu-latn") : String(days);
    label = isAr ? `يبدأ بعد ${n} يوم` : `Starts in ${n} day${days === 1 ? "" : "s"}`;
  }

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-hajr-mint/40 px-2 py-0.5 text-xs font-medium text-hajr-deep-navy", className)}>
      {label}
    </span>
  );
}
