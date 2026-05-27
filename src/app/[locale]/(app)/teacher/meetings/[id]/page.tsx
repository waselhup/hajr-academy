/**
 * Sprint 3 — Teacher meeting detail (RSVP + view minutes + action items).
 */
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { TeacherMeetingRsvp } from "@/components/meetings/TeacherMeetingRsvp";

export const dynamic = "force-dynamic";

interface ActionItem {
  text: string;
  assigneeId?: string;
  done?: boolean;
  due?: string;
}

export default async function TeacherMeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const session = await requireRole("TEACHER");
  const { id, locale } = await params;
  const t = await getTranslations("TeacherMeetings");
  const isAr = locale === "ar";

  const tp = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!tp) redirect(`/${locale}/teacher`);

  const meeting = await prisma.teacherMeeting.findUnique({
    where: { id },
    include: {
      attendees: {
        where: { teacherId: tp.id },
      },
    },
  });
  if (!meeting) notFound();
  if (meeting.attendees.length === 0) redirect(`/${locale}/teacher/meetings`);

  const attendee = meeting.attendees[0];
  const actionItems = (meeting.actionItems as ActionItem[] | null) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <a
          href={`/${locale}/teacher/meetings`}
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

      <TeacherMeetingRsvp
        meetingId={meeting.id}
        currentRsvp={attendee.rsvpStatus}
        joinUrl={meeting.zoomJoinUrl}
        status={meeting.status}
      />

      {meeting.agenda && (
        <Section title={t("agenda")}>
          <p className="whitespace-pre-wrap text-sm text-hajr-text">
            {isAr ? meeting.agendaAr ?? meeting.agenda : meeting.agenda}
          </p>
        </Section>
      )}

      {meeting.minutes && (
        <Section title={t("minutes")}>
          <p className="whitespace-pre-wrap text-sm text-hajr-text">{meeting.minutes}</p>
        </Section>
      )}

      {actionItems.length > 0 && (
        <Section title={t("actionItems")}>
          <ul className="space-y-2">
            {actionItems.map((it, idx) => (
              <li
                key={idx}
                className="flex items-center gap-3 rounded-lg border border-hajr-border bg-hajr-ivory/40 px-3 py-2 text-sm"
              >
                <span
                  className={`inline-block h-4 w-4 rounded border ${
                    it.done
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-hajr-border bg-white"
                  }`}
                  aria-hidden
                />
                <span className={it.done ? "text-hajr-muted line-through" : "text-hajr-text"}>
                  {it.text}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-hajr-border bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-hajr-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}
