import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { LibraryAgeTier } from "@prisma/client";
import { StudentLibraryGrid } from "./_components/student-library-grid";

export const dynamic = "force-dynamic";

function computeAgeTier(birthDate: Date | null, gradeLevel: string | null): LibraryAgeTier {
  if (gradeLevel) {
    const num = parseInt(gradeLevel, 10);
    if (!isNaN(num)) {
      if (num >= 1 && num <= 3) return "TIER_1_3";
      if (num >= 4 && num <= 6) return "TIER_4_6";
      if (num >= 7 && num <= 9) return "MIDDLE";
      if (num >= 10 && num <= 12) return "HIGH";
    }
  }
  if (birthDate) {
    const ageMs = Date.now() - birthDate.getTime();
    const age = ageMs / (365.25 * 24 * 3600 * 1000);
    if (age < 10) return "TIER_1_3";
    if (age < 13) return "TIER_4_6";
    if (age < 16) return "MIDDLE";
    return "HIGH";
  }
  return "MIDDLE";
}

export default async function StudentLibraryPage() {
  const session = await requireRole("STUDENT");
  const t = await getTranslations("Library");

  let items: Array<{
    id: string;
    title: string;
    titleAr: string;
    description: string | null;
    descriptionAr: string | null;
    type: string;
    skillLevel: string;
    targetAgeTier: string;
    durationMinutes: number;
    thumbnailUrl: string | null;
    progressPct: number;
    status: string;
  }> = [];
  let ageTier: LibraryAgeTier = "MIDDLE";

  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, birthDate: true, gradeLevel: true },
    });
    if (profile) {
      ageTier = computeAgeTier(profile.birthDate, profile.gradeLevel);

      const [rows, progress] = await Promise.all([
        prisma.libraryItem.findMany({
          where: {
            isPublished: true,
            OR: [{ targetAgeTier: "ALL" }, { targetAgeTier: ageTier }],
          },
          orderBy: { publishedAt: "desc" },
          take: 200,
        }),
        prisma.libraryProgress.findMany({
          where: { studentId: profile.id },
          select: { libraryItemId: true, progressPct: true, status: true },
        }),
      ]);

      const progMap = new Map(progress.map((p) => [p.libraryItemId, p]));
      items = rows.map((r) => {
        const p = progMap.get(r.id);
        return {
          id: r.id,
          title: r.title,
          titleAr: r.titleAr,
          description: r.description,
          descriptionAr: r.descriptionAr,
          type: r.type,
          skillLevel: r.skillLevel,
          targetAgeTier: r.targetAgeTier,
          durationMinutes: r.durationMinutes,
          thumbnailUrl: r.thumbnailUrl,
          progressPct: p?.progressPct ?? 0,
          status: p?.status ?? "NOT_STARTED",
        };
      });
    }
  } catch (e) {
    console.error("[student/library]", e);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hajr-deep-navy">{t("studentTitle")}</h1>
        <p className="text-sm text-hajr-gray-500">{t("studentSubtitle")}</p>
      </div>
      <StudentLibraryGrid items={items} ageTier={ageTier} />
    </div>
  );
}
