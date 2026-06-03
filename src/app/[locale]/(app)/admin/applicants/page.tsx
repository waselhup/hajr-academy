import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { UserPlus, Inbox } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { ALL_FEATURES } from "@/lib/applicants/service";
import type { ApplicantStage, Gender, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const STAGE_BADGE: Record<ApplicantStage, { variant: BadgeProps["variant"]; key: string }> = {
  NEW: { variant: "info", key: "Applicant.stageNew" },
  MESSAGING: { variant: "info", key: "Applicant.stageMessaging" },
  INTERVIEW: { variant: "navy", key: "Applicant.stageInterviewShort" },
  TESTING: { variant: "navy", key: "Applicant.stageTestShort" },
  DEMO: { variant: "warning", key: "Applicant.stageDemoShort" },
  DECISION: { variant: "draft", key: "Applicant.stageDecisionShort" },
};

export default async function AdminApplicantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ gender?: string; stage?: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations();
  const isAr = locale === "ar";

  const where: Prisma.ApplicantProfileWhereInput = {};
  if (sp.gender === "MALE" || sp.gender === "FEMALE") where.gender = sp.gender as Gender;
  if (sp.stage && ["NEW", "MESSAGING", "INTERVIEW", "TESTING", "DEMO", "DECISION"].includes(sp.stage)) {
    where.stage = sp.stage as ApplicantStage;
  }

  let loadError = false;
  let applicants: Awaited<ReturnType<typeof load>> = [];

  async function load() {
    return prisma.applicantProfile.findMany({
      where,
      orderBy: { lastActivityAt: "desc" },
      include: {
        user: { select: { name: true, email: true, isActive: true } },
        appliedProgram: { select: { nameEn: true, nameAr: true } },
        featureAccess: { where: { enabled: true }, select: { feature: true } },
      },
      take: 200,
    });
  }

  try {
    applicants = await load();
  } catch (e) {
    console.error("[admin/applicants] load failed:", e);
    loadError = true;
  }

  const dateFmt = new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-GB", {
    day: "numeric",
    month: "short",
  });

  const filters: { key: string; label: string; href: string; active: boolean }[] = [
    { key: "all", label: t("Applicant.filterAll"), href: "/admin/applicants", active: !sp.gender && !sp.stage },
    { key: "male", label: t("Applicant.filterMale"), href: "/admin/applicants?gender=MALE", active: sp.gender === "MALE" },
    { key: "female", label: t("Applicant.filterFemale"), href: "/admin/applicants?gender=FEMALE", active: sp.gender === "FEMALE" },
  ];

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-hajr-deep-navy">
          <UserPlus className="h-7 w-7 text-hajr-rose" />
          {t("Applicant.adminTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("Applicant.adminSubtitle")}</p>
      </header>

      {/* Gender filter chips */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.href}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              f.active
                ? "border-hajr-rose bg-hajr-rose/10 text-hajr-rose"
                : "border-hajr-gray-200 text-hajr-gray-500 hover:border-hajr-gray-300"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {loadError ? (
        <Card className="border-hajr-error/30 bg-hajr-error/5">
          <CardContent className="p-6 text-sm text-hajr-error">{t("Applicant.adminLoadError")}</CardContent>
        </Card>
      ) : applicants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-12 text-center text-sm text-muted-foreground">
            <Inbox className="h-8 w-8 text-hajr-gray-300" />
            {t("Applicant.adminEmpty")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-hajr-gray-200 text-start text-xs uppercase tracking-wide text-hajr-muted">
                    <th className="px-4 py-3 text-start font-semibold">{t("Applicant.colName")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("Applicant.colProgram")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("Applicant.colStage")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("Applicant.colFeatures")}</th>
                    <th className="px-4 py-3 text-start font-semibold">{t("Applicant.colActivity")}</th>
                  </tr>
                </thead>
                <tbody>
                  {applicants.map((a) => {
                    const badge = STAGE_BADGE[a.stage];
                    const program = a.appliedProgram
                      ? isAr
                        ? a.appliedProgram.nameAr
                        : a.appliedProgram.nameEn
                      : "—";
                    return (
                      <tr
                        key={a.id}
                        className="border-b border-hajr-gray-100 transition-colors hover:bg-hajr-gray-50"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/applicants/${a.id}`}
                            className="font-semibold text-hajr-deep-navy hover:underline"
                          >
                            {a.fullName}
                          </Link>
                          <div className="text-xs text-hajr-muted">{a.user.email}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{program}</td>
                        <td className="px-4 py-3">
                          <Badge variant={badge.variant}>{t(badge.key)}</Badge>
                          {a.isReadOnly && (
                            <Badge variant="draft" className="ms-1">
                              {t("Applicant.closedTag")}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {a.featureAccess.length}/{ALL_FEATURES.length}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {dateFmt.format(a.lastActivityAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
