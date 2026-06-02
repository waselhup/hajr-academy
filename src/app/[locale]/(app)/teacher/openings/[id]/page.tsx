import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { programName, SURVEY_QUESTIONS, VOICE_MAX_SECONDS } from "@/lib/openings/service";
import { canSeeOpeningDb } from "@/lib/openings/audience";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { ApplyForm, type ApplyQuestion } from "@/components/openings/apply-form";
import { WithdrawButton } from "@/components/openings/withdraw-button";
import { ArrowLeft, Inbox } from "lucide-react";

export const dynamic = "force-dynamic";

type AppStatus = "SUBMITTED" | "SHORTLISTED" | "SELECTED" | "REJECTED" | "WITHDRAWN";

function statusBadge(status: AppStatus): {
  variant: BadgeProps["variant"];
  key: string;
} {
  switch (status) {
    case "SUBMITTED":
      return { variant: "info", key: "Openings.statusApplied" };
    case "SHORTLISTED":
      return { variant: "navy", key: "Openings.statusShortlisted" };
    case "SELECTED":
      return { variant: "success", key: "Openings.statusSelected" };
    case "REJECTED":
      return { variant: "danger", key: "Openings.statusRejected" };
    case "WITHDRAWN":
      return { variant: "draft", key: "Openings.statusWithdrawn" };
  }
}

export default async function TeacherOpeningDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations();
  const isAr = locale === "ar";

  let loadError = false;
  let opening:
    | Awaited<ReturnType<typeof prisma.programOpening.findUnique>>
    | null = null;
  let existingApp:
    | Awaited<ReturnType<typeof prisma.teacherApplication.findUnique>>
    | null = null;
  // Whether this teacher is in the opening's audience (gates the apply form).
  let canApply = false;

  try {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    opening = await prisma.programOpening.findUnique({
      where: { id },
      include: { program: true },
    });

    if (opening && teacherProfile) {
      existingApp = await prisma.teacherApplication.findUnique({
        where: {
          openingId_teacherId: {
            openingId: opening.id,
            teacherId: teacherProfile.id,
          },
        },
      });

      // Single shared guard — resolves SELECTED_TEACHERS membership for us.
      // `program` is included on the query; narrow it for typing.
      const withProgram = opening as typeof opening & { program: { active: boolean } };
      canApply = await canSeeOpeningDb(
        { role: "TEACHER", teacherId: teacherProfile.id },
        {
          id: opening.id,
          status: opening.status,
          audienceType: opening.audienceType,
          applicantsPhaseOpen: opening.applicantsPhaseOpen,
          program: { active: withProgram.program.active },
        }
      );
    }
  } catch (e) {
    console.error("[teacher/openings/[id]] DB query failed:", e);
    loadError = true;
  }

  const backLink = (
    <Button asChild variant="ghost" size="sm">
      <Link href={`/${locale}/teacher/openings`}>
        <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
        {t("Openings.backToList")}
      </Link>
    </Button>
  );

  // Error state.
  if (loadError) {
    return (
      <div className="container mx-auto space-y-4 px-4 py-6" dir={isAr ? "rtl" : "ltr"}>
        {backLink}
        <Card className="border-hajr-error/30 bg-hajr-error/5">
          <CardContent className="p-6 text-sm text-hajr-error">
            {t("Openings.loadError")}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Closed / missing → friendly empty state.
  // (`program` is included on the loaded opening; narrow via a cast for typing.)
  const op = opening as
    | (NonNullable<typeof opening> & {
        program: {
          nameEn: string;
          nameAr: string;
          descriptionEn: string;
          descriptionAr: string;
          type: string;
        };
      })
    | null;

  if (!op || op.status !== "OPEN") {
    return (
      <div className="container mx-auto space-y-4 px-4 py-6" dir={isAr ? "rtl" : "ltr"}>
        {backLink}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Inbox className="h-10 w-10 text-hajr-gray-300" />
            <div className="text-sm text-muted-foreground">
              {t("Openings.openingClosed")}
            </div>
            <Button asChild variant="cta" size="sm">
              <Link href={`/${locale}/teacher/openings`}>
                {t("Openings.openProgram")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const title = programName(op.program, locale);
  const description = isAr ? op.program.descriptionAr : op.program.descriptionEn;

  // Already applied → read-only view (not the form).
  if (existingApp) {
    const badge = statusBadge(existingApp.status as AppStatus);
    const canWithdraw =
      existingApp.status === "SUBMITTED" || existingApp.status === "SHORTLISTED";
    const answers = (existingApp.answersJson ?? {}) as Record<string, string>;

    return (
      <div className="container mx-auto space-y-4 px-4 py-6" dir={isAr ? "rtl" : "ltr"}>
        {backLink}
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <CardTitle className="text-xl text-hajr-deep-navy">{title}</CardTitle>
              <Badge variant={badge.variant}>{t(badge.key)}</Badge>
            </div>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-hajr-border bg-hajr-rose/5 p-3 text-sm text-hajr-deep-navy">
              {t("Openings.alreadyAppliedNote")}
            </div>

            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                {t("Openings.whyQualified")}
              </div>
              <p className="mt-1 whitespace-pre-line text-sm">
                {existingApp.whyQualified}
              </p>
            </div>

            {SURVEY_QUESTIONS.map((q) =>
              answers[q.id] ? (
                <div key={q.id}>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    {t(q.labelKey)}
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm">{answers[q.id]}</p>
                </div>
              ) : null
            )}

            {existingApp.voiceIntroUrl && (
              <div className="text-xs text-muted-foreground">
                {t("Openings.voiceSubmitted")}
              </div>
            )}

            {existingApp.decisionNote && (
              <div className="rounded-md border border-hajr-border p-3 text-sm">
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("Openings.decisionNote")}
                </div>
                <p className="mt-1">{existingApp.decisionNote}</p>
              </div>
            )}

            {canWithdraw && (
              <div className="pt-1">
                <WithdrawButton applicationId={existingApp.id} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Out-of-audience (and no prior application) → friendly "not available" state.
  // The opening is OPEN but not targeted at this teacher; the apply POST also
  // rejects server-side, so this is purely a graceful UI (never the only gate).
  if (!canApply) {
    return (
      <div className="container mx-auto space-y-4 px-4 py-6" dir={isAr ? "rtl" : "ltr"}>
        {backLink}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Inbox className="h-10 w-10 text-hajr-gray-300" />
            <div className="text-sm text-muted-foreground">
              {t("Openings.notInAudience")}
            </div>
            <Button asChild variant="cta" size="sm">
              <Link href={`/${locale}/teacher/openings`}>
                {t("Openings.openProgram")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Otherwise → the apply form. Resolve survey labels/hints server-side so the
  // client island never needs the i18n keys.
  const questions: ApplyQuestion[] = SURVEY_QUESTIONS.map((q) => ({
    id: q.id,
    kind: q.kind,
    required: q.required,
    label: t(q.labelKey),
    hint: q.hintKey ? t(q.hintKey) : undefined,
  }));

  return (
    <div className="container mx-auto space-y-4 px-4 py-6" dir={isAr ? "rtl" : "ltr"}>
      {backLink}
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl text-hajr-deep-navy">
            {t("Openings.applyTitle", { program: title })}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
          <p className="text-sm text-muted-foreground">{t("Openings.applyIntro")}</p>
        </CardHeader>
        <CardContent>
          <ApplyForm
            openingId={op.id}
            locale={locale}
            questions={questions}
            maxSeconds={VOICE_MAX_SECONDS}
          />
        </CardContent>
      </Card>
    </div>
  );
}
