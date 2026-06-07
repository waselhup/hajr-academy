/**
 * Sprint 3 — Admin verifies a teacher's readiness.
 */
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminReadinessForm } from "@/components/teacher/AdminReadinessForm";

export const dynamic = "force-dynamic";

export default async function AdminTeacherReadinessPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { id, locale } = await params;
  const t = await getTranslations("Readiness");
  const isAr = locale === "ar";

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, nameAr: true, email: true, avatar: true } },
      readiness: true,
    },
  });
  if (!teacher) notFound();
  const name = isAr ? teacher.user.nameAr ?? teacher.user.name : teacher.user.name;
  const r = teacher.readiness;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hajr-text">
          {t("adminPageTitle")}: {name}
        </h1>
        <p className="mt-1 text-sm text-hajr-muted">{teacher.user.email}</p>
      </div>

      {/* F4 — interactive tools the teacher specified (read-only). */}
      <div className="rounded-xl border border-hajr-border bg-white p-5 shadow-sm">
        <p className="mb-2 text-sm font-medium text-hajr-text">{t("toolsSpecified")}</p>
        {(r?.interactiveToolsList?.length ?? 0) === 0 && !r?.interactiveToolsOther ? (
          <p className="text-sm text-hajr-muted">{t("toolsNone")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(r?.interactiveToolsList ?? []).map((tool) => (
              <span
                key={tool}
                className="inline-flex items-center rounded-full border border-hajr-border bg-hajr-ivory px-3 py-1 text-xs font-medium text-hajr-text"
              >
                {t(`tool_${tool}`)}
              </span>
            ))}
            {r?.interactiveToolsOther && (
              <span className="inline-flex items-center rounded-full border border-hajr-border bg-hajr-ivory px-3 py-1 text-xs font-medium text-hajr-text">
                {t("toolsOther")}: {r.interactiveToolsOther}
              </span>
            )}
          </div>
        )}
      </div>

      <AdminReadinessForm
        teacherId={teacher.id}
        initial={{
          zoomTested: r?.zoomTested ?? false,
          digitalToolsOk: r?.digitalToolsOk ?? false,
          mockClassDone: r?.mockClassDone ?? false,
          interactiveOk: r?.interactiveOk ?? false,
          classroomMgmt: r?.classroomMgmt ?? false,
          selfRating: r?.selfRating ?? null,
          adminVerified: r?.adminVerified ?? false,
          adminNotes: r?.adminNotes ?? "",
        }}
      />
    </div>
  );
}
