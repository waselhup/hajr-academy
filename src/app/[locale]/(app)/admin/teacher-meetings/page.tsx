/**
 * Sprint 3 — Admin teacher-meetings list + create.
 */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { NewMeetingDialog } from "@/components/meetings/NewMeetingDialog";

export const dynamic = "force-dynamic";

export default async function AdminMeetingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("TeacherMeetings");
  const isAr = locale === "ar";

  const [meetings, teachers] = await Promise.all([
    prisma.teacherMeeting.findMany({
      orderBy: { scheduledAt: "desc" },
      include: {
        _count: { select: { attendees: true } },
      },
      take: 60,
    }),
    prisma.teacherProfile.findMany({
      where: { active: true },
      include: { user: { select: { name: true, nameAr: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-hajr-text">{t("adminPageTitle")}</h1>
          <p className="mt-1 text-sm text-hajr-muted">{t("adminPageSubtitle")}</p>
        </div>
        <NewMeetingDialog
          teachers={teachers.map((tp) => ({
            id: tp.id,
            name: isAr ? tp.user.nameAr ?? tp.user.name : tp.user.name,
          }))}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-hajr-border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-hajr-ivory text-xs uppercase text-hajr-muted">
            <tr>
              <th className="px-4 py-3 text-start">{t("colTitle")}</th>
              <th className="px-4 py-3 text-start">{t("colScheduled")}</th>
              <th className="px-4 py-3 text-start">{t("colStatus")}</th>
              <th className="px-4 py-3 text-start">{t("colAttendees")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-hajr-border">
            {meetings.map((m) => {
              const title = isAr ? m.titleAr : m.title;
              return (
                <tr key={m.id} className="hover:bg-hajr-ivory/50">
                  <td className="px-4 py-3 font-medium text-hajr-text">{title}</td>
                  <td className="px-4 py-3 text-hajr-muted">
                    {new Date(m.scheduledAt).toLocaleString(isAr ? "ar-SA" : "en-US")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {t(`status_${m.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-hajr-muted">{m._count.attendees}</td>
                  <td className="px-4 py-3 text-end">
                    <Link
                      href={`/${locale}/admin/teacher-meetings/${m.id}`}
                      className="font-medium text-hajr-rose hover:underline"
                    >
                      {t("manage")} →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {meetings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-hajr-muted">
                  {t("noMeetings")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
