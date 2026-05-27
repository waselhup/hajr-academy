/**
 * Sprint 3 — Teacher readiness self-checklist.
 */
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ReadinessForm } from "@/components/teacher/ReadinessForm";

export const dynamic = "force-dynamic";

export default async function TeacherReadinessPage() {
  const session = await requireRole("TEACHER");
  const t = await getTranslations("Readiness");

  const tp = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    include: { readiness: true },
  });

  if (!tp) {
    return (
      <div className="rounded-xl border border-hajr-border bg-white p-6 text-sm text-hajr-muted">
        {t("noProfile")}
      </div>
    );
  }

  const r = tp.readiness;
  const items = [
    r?.zoomTested,
    r?.digitalToolsOk,
    r?.mockClassDone,
    r?.interactiveOk,
    r?.classroomMgmt,
  ];
  const completed = items.filter(Boolean).length;
  const pct = Math.round((completed / 5) * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hajr-text">{t("pageTitle")}</h1>
        <p className="mt-1 text-sm text-hajr-muted">{t("pageSubtitle")}</p>
      </div>

      <div className="rounded-xl border border-hajr-border bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-hajr-text">
            {t("progress")}: {pct}%
          </span>
          {r?.adminVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              ✓ {t("verifiedByAdmin")}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {t("pendingVerification")}
            </span>
          )}
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-hajr-ivory">
          <div
            className="h-full bg-hajr-rose transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ReadinessForm
        initial={{
          zoomTested: r?.zoomTested ?? false,
          digitalToolsOk: r?.digitalToolsOk ?? false,
          mockClassDone: r?.mockClassDone ?? false,
          interactiveOk: r?.interactiveOk ?? false,
          classroomMgmt: r?.classroomMgmt ?? false,
          selfRating: r?.selfRating ?? null,
        }}
      />

      {r?.adminNotes && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="mb-1 font-medium text-amber-900">{t("adminNotes")}</p>
          <p className="text-amber-900/80">{r.adminNotes}</p>
        </div>
      )}
    </div>
  );
}
