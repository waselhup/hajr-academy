import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";

/**
 * Surfaces a Rose-Mauve banner on the teacher dashboard when:
 *   - there is no passing tech-check in the last 24 h, AND
 *   - the teacher has a class within the next 60 min.
 *
 * Renders nothing in all other cases. Safe to drop into the teacher
 * dashboard unconditionally; the queries cost two cheap counts.
 */
export async function TechCheckBanner({
  locale,
  userId,
}: {
  locale: string;
  userId: string;
}) {
  let needsBanner = false;
  try {
    const since = new Date(Date.now() - 24 * 3600_000);
    const last = await prisma.techCheck.findFirst({
      where: { teacherId: userId, passed: true, createdAt: { gte: since } },
      select: { id: true },
    });
    if (last) return null;

    // Look up the teacher's classes & next-hour sessions
    const tp = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!tp) return null;
    const within60 = new Date(Date.now() + 60 * 60_000);
    const upcoming = await prisma.classSession.findFirst({
      where: {
        class: { teacherId: tp.id },
        status: "SCHEDULED",
        scheduledDate: { gte: new Date(), lte: within60 },
      },
      select: { id: true },
    });
    needsBanner = !!upcoming;
  } catch {
    needsBanner = false;
  }
  if (!needsBanner) return null;

  const t = await getTranslations("TechCheck");
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-amber-300 bg-amber-50 p-5 shadow-card">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-hajr-deep-navy">{t("bannerTitle")}</div>
        <div className="text-xs text-hajr-gray-600">{t("bannerBody")}</div>
      </div>
      <Link
        href={`/${locale}/teacher/tech-check`}
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-hajr-deep-navy px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-hajr-navy"
      >
        {t("runNow")}
      </Link>
    </div>
  );
}
