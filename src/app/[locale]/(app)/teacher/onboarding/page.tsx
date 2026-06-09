/**
 * Owner batch 5, item #5 — Teacher onboarding questionnaire (server page).
 *
 * This page is the LOOP-BREAKER for the /teacher layout gate:
 *   - If the teacher is ALREADY onboarded, it redirect()s to /teacher.
 *   - If NOT onboarded, it RENDERS the form (it never redirects back to the
 *     gate), so the layout can safely send not-yet-onboarded teachers here
 *     even when no path header is available. See teacher/layout.tsx.
 *
 * Current TeacherReadiness answers (if any) are prefilled into the form.
 */
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { OnboardingClient } from "./onboarding-client";

export const dynamic = "force-dynamic";

export default async function TeacherOnboardingPage() {
  const session = await requireRole("TEACHER");
  const locale = await getLocale();
  const t = await getTranslations("TeacherOnboarding");

  const tp = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    include: { readiness: true },
  });

  // No profile linked — cannot onboard; show a friendly notice instead of
  // trapping the teacher in a redirect they cannot satisfy.
  if (!tp) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-hajr-border bg-white p-6 text-sm text-hajr-muted">
        {t("noProfile")}
      </div>
    );
  }

  // Already onboarded → leave the gate (this is what prevents a loop).
  if (tp.onboardingCompletedAt != null) {
    redirect(`/${locale}/teacher`);
  }

  const r = tp.readiness;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hajr-text">{t("title")}</h1>
        <p className="mt-1 text-sm text-hajr-muted">{t("subtitle")}</p>
      </div>

      <OnboardingClient
        initial={{
          zoomTested: r?.zoomTested ?? false,
          digitalToolsOk: r?.digitalToolsOk ?? false,
          mockClassDone: r?.mockClassDone ?? false,
          interactiveTools: r?.interactiveToolsList ?? [],
          interactiveToolsOther: r?.interactiveToolsOther ?? "",
          classroomMgmt: r?.classroomMgmt ?? false,
          selfRating: r?.selfRating ?? null,
        }}
      />
    </div>
  );
}
