import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { Video } from "lucide-react";
import { RecordingsClient, type RecordingRow } from "./recordings-client";

export const dynamic = "force-dynamic";

export default async function AdminRecordingsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations();

  let rows: RecordingRow[] = [];

  try {
    const dbRows = await prisma.classSession.findMany({
      where: { zoomRecordingUrl: { not: null } },
      include: {
        class: {
          include: {
            teacher: {
              include: {
                user: { select: { name: true, nameAr: true } },
              },
            },
          },
        },
        lessonSummary: {
          select: { confidence: true },
        },
      },
      orderBy: { scheduledDate: "desc" },
      take: 100,
    });
    rows = dbRows.map((r) => ({
      id: r.id,
      scheduledDate: r.scheduledDate.toISOString(),
      startedAt: r.startedAt?.toISOString() ?? null,
      endedAt: r.endedAt?.toISOString() ?? null,
      className: r.class.name,
      classNameAr: r.class.nameAr ?? null,
      teacherName:
        r.class.teacher.user.nameAr ?? r.class.teacher.user.name,
      durationMinutes: r.class.durationMinutes,
      zoomRecordingUrl: r.zoomRecordingUrl!,
      hasSummary: !!r.lessonSummary,
      summaryConfidence: r.lessonSummary?.confidence
        ? Number(r.lessonSummary.confidence)
        : null,
    }));
  } catch (e) {
    console.error("[admin-recordings] DB query failed:", e);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Video className="h-5 w-5 text-brand-rose" />
        <h1 className="text-2xl font-bold">{t("Video.recordings")}</h1>
      </div>
      <RecordingsClient rows={rows} />
    </div>
  );
}
