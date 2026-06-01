/**
 * Server-side guards for the applicant portal. Kept separate from service.ts
 * because these import next/navigation (redirect) — service.ts stays pure data.
 *
 * EVERY applicant page calls requireApplicant() (role gate) and, for any page
 * beyond the always-on Overview, requireApplicantFeature() (per-feature gate).
 * Never trust client-side nav hiding — these run on the server.
 */
import { redirect } from "next/navigation";
import type { ApplicantFeature } from "@prisma/client";
import { requireRole } from "@/lib/rbac";
import { getApplicantByUserId, isFeatureEnabled } from "@/lib/applicants/service";

/** Resolve the signed-in APPLICANT + their profile, or redirect home. */
export async function requireApplicant() {
  const session = await requireRole("APPLICANT");
  const applicant = await getApplicantByUserId(session.user.id);
  if (!applicant) {
    // Authenticated as APPLICANT but no profile row — treat as not-an-applicant.
    redirect("/login");
  }
  return { session, applicant };
}

/**
 * Gate a page behind a single feature. Redirects to the Overview (the always-on
 * home) when the feature is disabled — so a locked URL never renders content.
 */
export async function requireApplicantFeature(feature: ApplicantFeature) {
  const { session, applicant } = await requireApplicant();
  if (applicant.isReadOnly && feature !== "OVERVIEW" && feature !== "MESSAGING") {
    // Closed accounts keep read access to Overview + their message history only.
    redirect("/applicant");
  }
  const enabled = await isFeatureEnabled(applicant.id, feature);
  if (!enabled) {
    redirect("/applicant");
  }
  return { session, applicant };
}
