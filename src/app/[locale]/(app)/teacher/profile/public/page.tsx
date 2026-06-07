/**
 * Sprint 3 — Teacher's public profile editor.
 */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PublicProfileEditor } from "@/components/teacher/PublicProfileEditor";

export const dynamic = "force-dynamic";

export default async function TeacherPublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations("TeacherProfile");

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { name: true, nameAr: true, avatar: true } } },
  });
  if (!teacher) {
    return (
      <div className="rounded-xl border border-hajr-border bg-white p-6 text-sm text-hajr-muted">
        {t("noProfile")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-hajr-text">{t("editTitle")}</h1>
          <p className="mt-1 text-sm text-hajr-muted">{t("editSubtitle")}</p>
        </div>
        {teacher.publicSlug && (
          <Link
            href={`/${locale}/teachers/${teacher.publicSlug}`}
            target="_blank"
            className="inline-flex h-11 items-center rounded-lg border border-hajr-border bg-white px-4 text-sm font-medium text-hajr-text hover:bg-hajr-ivory"
          >
            {t("previewProfile")} ↗
          </Link>
        )}
      </div>

      <PublicProfileEditor
        initial={{
          bio: teacher.bio ?? "",
          introVideoUrl: teacher.introVideoUrl ?? "",
          languages: teacher.languages,
          yearsExp: teacher.yearsExp ?? 0,
          specializations: teacher.specializations,
          publicSlug: teacher.publicSlug ?? "",
          avatar: teacher.user.avatar ?? null,
          name: locale === "ar" ? teacher.user.nameAr ?? teacher.user.name : teacher.user.name,
        }}
      />

      <div className="rounded-xl border border-hajr-border bg-hajr-ivory/60 p-4 text-xs text-hajr-muted">
        <p className="font-medium text-hajr-text">{t("verificationStatus")}</p>
        <p className="mt-1">
          {teacher.isVerified ? t("verifiedDesc") : t("notVerifiedDesc")}
        </p>
      </div>
    </div>
  );
}
