import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getVideoProvider } from "@/lib/video";
import { LiveMonitorClient, type LiveRow, type RecentRow } from "./_components/live-monitor-client";

export const dynamic = "force-dynamic";

export default async function AdminLivePage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  let liveRows: LiveRow[] = [];
  let recentRows: RecentRow[] = [];

  try {
    const [liveSessions, recentSessions] = await Promise.all([
      prisma.classSession.findMany({
        where: { status: "LIVE" },
        include: {
          class: {
            include: {
              teacher: {
                include: {
                  user: { select: { name: true, nameAr: true, avatar: true } },
                },
              },
              enrollments: { where: { status: "ACTIVE" } },
            },
          },
          attendances: true,
        },
        orderBy: { startedAt: "asc" },
      }),
      prisma.classSession.findMany({
        where: { status: "COMPLETED" },
        include: {
          class: {
            include: {
              teacher: { include: { user: { select: { name: true, nameAr: true } } } },
              enrollments: { where: { status: "ACTIVE" } },
            },
          },
          _count: { select: { attendances: true } },
        },
        orderBy: { endedAt: "desc" },
        take: 5,
      }),
    ]);

    const provider = getVideoProvider();
    liveRows = await Promise.all(
      liveSessions.map(async (s) => {
        let participantCount: number | null = null;
        if (s.zoomMeetingId) {
          participantCount = await provider
            .getLiveParticipantCount(s.zoomMeetingId)
            .catch(() => null);
        }
        return {
          id: s.id,
          classId: s.classId,
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

    recentRows = recentSessions.map((s) => ({
      id: s.id,
      className: s.class.nameAr ?? s.class.name,
      cohortCode: s.class.cohortCode,
      teacherName: s.class.teacher.user.nameAr ?? s.class.teacher.user.name,
      endedAt: (s.endedAt ?? s.scheduledDate).toISOString(),
      durationMinutes: s.class.durationMinutes,
      enrolledCount: s.class.enrollments.length,
      attendanceCount: s._count.attendances,
    }));
  } catch (e) {
    console.error("[admin-live] DB query failed:", e);
  }

  return <LiveMonitorClient live={liveRows} recent={recentRows} />;
}
