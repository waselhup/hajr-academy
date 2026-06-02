/**
 * Admin — Program Opening review (per-opening applicant review).
 *
 * Server component: loads the opening + its applications (with teacher/user),
 * mints short-lived signed URLs for the private voice-intro clips, resolves the
 * survey question labels via i18n, then hands everything to ReviewClient which
 * wires the shortlist/select/reject + reopen/close server actions.
 */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Users } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SURVEY_QUESTIONS,
  VOICE_BUCKET,
  programName,
  listTeacherSpecializations,
  type TeacherFilter,
} from "@/lib/openings/service";
import { resolveOpeningAudience } from "@/lib/openings/audience";
import { ReviewClient } from "@/components/openings/review-client";
import { AudienceManager } from "@/components/openings/audience-manager";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "success" | "info" | "draft"> = {
  OPEN: "success",
  FILLED: "info",
  CLOSED: "draft",
};

export default async function AdminOpeningReviewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Openings");
  const isAr = locale === "ar";

  const opening = await prisma.programOpening.findUnique({
    where: { id },
    include: {
      program: true,
      applications: {
        include: { teacher: { include: { user: { select: { name: true, email: true } } } } },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  // Not-found → empty-state card + link back.
  if (!opening) {
    return (
      <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/${locale}/admin/openings`}>
            <ArrowLeft className="me-1 h-4 w-4" />
            {t("adminTitle")}
          </Link>
        </Button>
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            {t("noOpenings")}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Resolve survey labels server-side so the client renders plain strings.
  const surveyLabels = SURVEY_QUESTIONS.map((q) => ({ id: q.id, label: t(q.labelKey.replace(/^Openings\./, "")) }));

  // Mint signed URLs for private voice intros (best-effort, per application).
  const supabase = createSupabaseServiceClient();
  const applications = await Promise.all(
    opening.applications.map(async (a) => {
      let voiceSignedUrl: string | null = null;
      if (a.voiceIntroUrl) {
        try {
          const { data } = await supabase.storage
            .from(VOICE_BUCKET)
            .createSignedUrl(a.voiceIntroUrl, 3600);
          voiceSignedUrl = data?.signedUrl ?? null;
        } catch (e) {
          console.error("[admin-openings] signed-url failed (non-fatal):", e);
        }
      }
      return {
        id: a.id,
        status: a.status as "SUBMITTED" | "SHORTLISTED" | "SELECTED" | "REJECTED" | "WITHDRAWN",
        whyQualified: a.whyQualified,
        answersJson: (a.answersJson ?? {}) as Record<string, string>,
        voiceSignedUrl,
        teacherName: a.teacher.user.name,
        teacherEmail: a.teacher.user.email,
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
        decisionNote: a.decisionNote,
      };
    })
  );

  const statusLabel =
    opening.status === "OPEN"
      ? t("statusOpen")
      : opening.status === "FILLED"
        ? t("statusFilled")
        : t("statusClosed");

  // ── Audience surface data (Agent C) ──
  // Resolve the CURRENT eligible audience for live counts + decode the saved
  // SELECTED_TEACHERS snapshot so the picker round-trips the admin's last pick.
  const [specializationOptions, resolvedAudience] = await Promise.all([
    listTeacherSpecializations(),
    resolveOpeningAudience({
      id: opening.id,
      audienceType: opening.audienceType,
      applicantsPhaseOpen: opening.applicantsPhaseOpen,
    }),
  ]);

  const cfg = (opening.audienceConfig ?? {}) as {
    teacherIds?: unknown;
    filter?: unknown;
  };
  const initialSelectedTeacherIds = Array.isArray(cfg.teacherIds)
    ? cfg.teacherIds.filter((x): x is string => typeof x === "string")
    : [];
  const initialFilter = (cfg.filter && typeof cfg.filter === "object" ? cfg.filter : {}) as TeacherFilter;

  // Live counts (transparent, no black box).
  const appliedCount = opening.applications.filter(
    (a) => a.status !== "WITHDRAWN"
  ).length;
  const selectedCount = opening.applications.filter((a) => a.status === "SELECTED").length;
  // Gentle phase-2 hint: all internal applications decided, none selected.
  const decidedStates = new Set(["SELECTED", "REJECTED", "WITHDRAWN"]);
  const allDecided =
    opening.applications.length > 0 &&
    opening.applications.every((a) => decidedStates.has(a.status));
  const suggestOpenApplicants =
    opening.audienceType === "INTERNAL_THEN_APPLICANTS" &&
    !opening.applicantsPhaseOpen &&
    allDecided &&
    selectedCount === 0;

  return (
    <div className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div>
        <Button asChild size="sm" variant="ghost" className="mb-2">
          <Link href={`/${locale}/admin/openings`}>
            <ArrowLeft className="me-1 h-4 w-4" />
            {t("adminTitle")}
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-hajr-deep-navy">
            {programName(opening.program, locale)}
          </h1>
          <Badge variant={STATUS_VARIANT[opening.status] ?? "draft"}>{statusLabel}</Badge>
        </div>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            <span className="num">{applications.length}</span> {t("applicantCount")}
          </span>
        </p>
      </div>

      <AudienceManager
        openingId={opening.id}
        openingStatus={opening.status as "OPEN" | "CLOSED" | "FILLED"}
        audienceType={opening.audienceType}
        applicantsPhaseOpen={opening.applicantsPhaseOpen}
        specializationOptions={specializationOptions}
        initialSelectedTeacherIds={initialSelectedTeacherIds}
        initialFilter={initialFilter}
        counts={{
          internalInvited: resolvedAudience.teacherUserIds.length,
          applicantsReached: resolvedAudience.applicantUserIds.length,
          applied: appliedCount,
          selected: selectedCount,
        }}
        suggestOpenApplicants={suggestOpenApplicants}
      />

      <ReviewClient
        openingId={opening.id}
        openingStatus={opening.status as "OPEN" | "CLOSED" | "FILLED"}
        applications={applications}
        surveyLabels={surveyLabels}
      />
    </div>
  );
}
