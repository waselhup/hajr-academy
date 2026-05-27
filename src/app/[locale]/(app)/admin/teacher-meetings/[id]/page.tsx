/**
 * Sprint 3 — Admin meeting detail (manage minutes, action items, attendance).
 */
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminMeetingDetail } from "@/components/meetings/AdminMeetingDetail";

export const dynamic = "force-dynamic";

export default async function AdminMeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { id, locale } = await params;
  const t = await getTranslations("TeacherMeetings");
  const isAr = locale === "ar";

  const meeting = await prisma.teacherMeeting.findUnique({
    where: { id },
    include: {
      attendees: {
        include: {
          teacher: {
            include: { user: { select: { name: true, nameAr: true, avatar: true } } },
          },
        },
      },
    },
  });
  if (!meeting) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <a
          href={`/${locale}/admin/teacher-meetings`}
          className="text-sm text-hajr-muted hover:text-hajr-rose"
        >
          ← {t("backToList")}
        </a>
        <h1 className="mt-2 text-2xl font-bold text-hajr-text">
          {isAr ? meeting.titleAr : meeting.title}
        </h1>
        <p className="mt-1 text-sm text-hajr-muted">
          {new Date(meeting.scheduledAt).toLocaleString(isAr ? "ar-SA" : "en-US")} ·{" "}
          {meeting.durationMin} {t("minutesShort")}
        </p>
      </div>

      <AdminMeetingDetail
        meetingId={meeting.id}
        initial={{
          minutes: meeting.minutes ?? "",
          actionItems:
            (meeting.actionItems as Array<{
              text: string;
              assigneeId?: string;
              done?: boolean;
              due?: string;
            }>) ?? [],
          status: meeting.status,
          zoomJoinUrl: meeting.zoomJoinUrl ?? "",
        }}
        attendees={meeting.attendees.map((a) => ({
          id: a.id,
          name: isAr
            ? a.teacher.user.nameAr ?? a.teacher.user.name
            : a.teacher.user.name,
          rsvp: a.rsvpStatus,
          attended: a.attended,
        }))}
      />
    </div>
  );
}
