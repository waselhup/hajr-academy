/**
 * Sprint 3 — Admin teacher activity dashboard (privacy-safe).
 * No page tracking. Only outcomes from existing data.
 */
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { getTeacherActivity } from "@/lib/teacher/activity";

export const dynamic = "force-dynamic";

function relativeTime(d: Date | null, isAr: boolean): string {
  if (!d) return "—";
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return isAr ? "الآن" : "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days}d`;
}

export default async function TeacherActivityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("TeacherActivity");
  const rows = await getTeacherActivity();
  const isAr = locale === "ar";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-hajr-text">{t("pageTitle")}</h1>
          <p className="mt-1 text-sm text-hajr-muted">{t("pageSubtitle")}</p>
          <p className="mt-1 text-xs italic text-hajr-muted">{t("privacyNote")}</p>
        </div>
        <a
          href="/api/admin/teacher-activity?format=csv"
          className="inline-flex h-11 items-center rounded-lg border border-hajr-border bg-white px-4 text-sm font-medium text-hajr-text hover:bg-hajr-ivory"
        >
          ⬇ {t("exportCsv")}
        </a>
      </div>

      <div className="overflow-x-auto rounded-xl border border-hajr-border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-hajr-ivory text-xs uppercase text-hajr-muted">
            <tr>
              <th className="px-3 py-3 text-start">{t("colTeacher")}</th>
              <th className="px-3 py-3 text-start">{t("colStatus")}</th>
              <th className="px-3 py-3 text-start">{t("lastLogin")}</th>
              <th className="px-3 py-3 text-start">{t("sessionsLast7")}</th>
              <th className="px-3 py-3 text-start">{t("sessionsLast30")}</th>
              <th className="px-3 py-3 text-start">{t("onTimePct")}</th>
              <th className="px-3 py-3 text-start">{t("avgRating")}</th>
              <th className="px-3 py-3 text-start">{t("responseTime")}</th>
              <th className="px-3 py-3 text-start">{t("activeClasses")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hajr-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-hajr-muted">
                  {t("noTeachers")}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const name = isAr ? r.nameAr ?? r.name : r.name;
                return (
                  <tr key={r.teacherId} className="hover:bg-hajr-ivory/50">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-hajr-rose/15 text-xs font-semibold text-hajr-rose">
                          {name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-hajr-text">
                            {name}
                            {r.isVerified && (
                              <span className="ms-1 text-amber-500" title="verified">
                                ✓
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          r.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {r.active ? t("active") : t("inactive")}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-hajr-muted">
                      {relativeTime(r.lastLoginAt, isAr)}
                    </td>
                    <td className="px-3 py-3">{r.sessionsLast7}</td>
                    <td className="px-3 py-3">{r.sessionsLast30}</td>
                    <td className="px-3 py-3">
                      {r.onTimePct === null ? "—" : `${r.onTimePct}%`}
                    </td>
                    <td className="px-3 py-3">
                      {r.avgRating === null ? "—" : (
                        <span>
                          ★ {r.avgRating}{" "}
                          <span className="text-xs text-hajr-muted">
                            ({r.totalRatings})
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-hajr-muted">
                      {r.responseTimeAvgMin === null ? "—" : `${r.responseTimeAvgMin}m`}
                    </td>
                    <td className="px-3 py-3">{r.activeClasses}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
