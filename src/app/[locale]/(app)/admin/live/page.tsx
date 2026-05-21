import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getVideoProvider } from "@/lib/video";
import { LiveMonitorClient } from "./_components/live-monitor-client";

export const dynamic = "force-dynamic";

export default async function AdminLivePage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  let rows: any[] = [];

  try {
    const liveSessions = await prisma.classSession.findMany({
      where: { status: "LIVE" },
      include: {
        class: {
          include: {
            teacher: { include: { user: { select: { name: true, nameAr: true, avatar: true } } } },
            enrollments: { where: { status: "ACTIVE" } },
          },
        },
        attendances: true,
      },
      orderBy: { startedAt: "asc" },
    });

    const provider = getVideoProvider();
    rows = await Promise.all(
      liveSessions.map(async (s) => {
        let participantCount: number | null = null;
        if (s.zoomMeetingId) {
          participantCount = await provider.getLiveParticipantCount(s.zoomMeetingId).catch(() => null);
        }
        return {
          id: s.id,
          className: s.class.nameAr ?? s.class.name,
          cohortCode: s.class.cohortCode,
          teacherName: s.class.teacher.user.nameAr ?? s.class.teacher.user.name,
          startedAt: (s.startedAt ?? s.scheduledDate).toISOString(),
          durationMinutes: s.class.durationMinutes,
          enrolledCount: s.class.enrollments.length,
          joinedCount: s.attendances.filter((a) => a.joinedAt).length,
          participantCount,
          meetingId: s.zoomMeetingId,
        };
      })
    );
  } catch (e) {
    console.error("[admin-live] DB query failed:", e);
  }

  return <LiveMonitorClient rows={rows} />;
}
