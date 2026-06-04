/**
 * Sprint 3 — Teacher meetings overview (upcoming + past).
 */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeacherMeetingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireRole("TEACHER");
  const { locale } = await params;
  const t = await getTranslations("TeacherMeetings");
  const isAr = locale === "ar";

  const tp = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!tp) {
    return <div className="text-sm text-hajr-muted">{t("noProfile")}</div>;
  }

  const now = new Date();
  const myAttendees = await prisma.teacherMeetingAttendee.findMany({
    where: { teacherId: tp.id },
    include: {
      meeting: true,
    },
    orderBy: { meeting: { scheduledAt: "desc" } },
    take: 100,
  });

  const upcoming = myAttendees.filter((a) => a.meeting.scheduledAt >= now);
  const past = myAttendees.filter((a) => a.meeting.scheduledAt < now);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hajr-text">{t("teacherPageTitle")}</h1>
        <p className="mt-1 text-sm text-hajr-muted">{t("teacherPageSubtitle")}</p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-hajr-muted">
          {t("upcoming")} ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-hajr-border bg-white p-6 text-sm text-hajr-muted">
            {t("noUpcoming")}
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((a) => (
              <MeetingRow
                key={a.id}
                locale={locale}
                isAr={isAr}
                meetingId={a.meeting.id}
                title={isAr ? a.meeting.titleAr : a.meeting.title}
                scheduledAt={a.meeting.scheduledAt}
                status={a.meeting.status}
                rsvp={a.rsvpStatus}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-hajr-muted">
          {t("past")} ({past.length})
        </h2>
        {past.length === 0 ? (
          <p className="rounded-xl border border-hajr-border bg-white p-6 text-sm text-hajr-muted">
            {t("noPast")}
          </p>
        ) : (
          <ul className="space-y-2">
            {past.map((a) => (
              <MeetingRow
                key={a.id}
                locale={locale}
                isAr={isAr}
                meetingId={a.meeting.id}
                title={isAr ? a.meeting.titleAr : a.meeting.title}
                scheduledAt={a.meeting.scheduledAt}
                status={a.meeting.status}
                rsvp={a.rsvpStatus}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MeetingRow({
  locale,
  isAr,
  meetingId,
  title,
  scheduledAt,
  status,
  rsvp,
}: {
  locale: string;
  isAr: boolean;
  meetingId: string;
  title: string;
  scheduledAt: Date;
  status: string;
  rsvp: string | null;
}) {
  return (
    <li>
      <Link
        href={`/${locale}/teacher/meetings/${meetingId}`}
        className="flex items-center justify-between rounded-xl border border-hajr-border bg-white px-4 py-3 shadow-sm hover:shadow-md"
      >
        <div>
          <p className="font-medium text-hajr-text">{title}</p>
          <p className="text-xs text-hajr-muted">
            {new Date(scheduledAt).toLocaleString(isAr ? "ar-SA-u-nu-latn" : "en-US")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {rsvp && (
            <span className="rounded-full bg-hajr-ivory px-2.5 py-1 text-[10px] font-semibold uppercase text-hajr-text">
              {rsvp}
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
            {status}
          </span>
        </div>
      </Link>
    </li>
  );
}
