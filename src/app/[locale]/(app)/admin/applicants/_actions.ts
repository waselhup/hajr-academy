"use server";

import { revalidatePath } from "next/cache";
import type { ApplicantFeature, ApplicantStage } from "@prisma/client";
import { requireRole } from "@/lib/rbac";
import {
  setStage,
  toggleFeature,
  convertToTeacher,
  closeApplicant,
  deliverAdminMessageToApplicant,
} from "@/lib/applicants/service";

type Result = { ok: true } | { ok: false; error: string };

/** Admin: set/advance an applicant's stage (applies that stage's feature bundle). */
export async function setStageAction(
  applicantId: string,
  stage: ApplicantStage
): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const res = await setStage({ applicantId, stage, adminUserId: session.user.id });
  revalidatePath(`/admin/applicants/${applicantId}`);
  revalidatePath("/admin/applicants");
  return res;
}

/** Admin: toggle a single feature for an applicant (override beats stage). */
export async function toggleFeatureAction(
  applicantId: string,
  feature: ApplicantFeature,
  enabled: boolean
): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const res = await toggleFeature({ applicantId, feature, enabled, adminUserId: session.user.id });
  revalidatePath(`/admin/applicants/${applicantId}`);
  revalidatePath("/admin/applicants");
  return res;
}

/** Admin: convert an applicant into a real teacher (the funnel exit). */
export async function convertToTeacherAction(applicantId: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const res = await convertToTeacher({ applicantId, adminUserId: session.user.id });
  revalidatePath(`/admin/applicants/${applicantId}`);
  revalidatePath("/admin/applicants");
  return res.ok ? { ok: true } : res;
}

/** Admin: politely close an applicant (stage=DECISION, read-only, closing note). */
export async function closeApplicantAction(
  applicantId: string,
  closingMessage?: string
): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const res = await closeApplicant({ applicantId, adminUserId: session.user.id, closingMessage });
  revalidatePath(`/admin/applicants/${applicantId}`);
  revalidatePath("/admin/applicants");
  return res;
}

/** Admin: send a free-text message to an applicant (admin-scoped thread). */
export async function messageApplicantAction(
  applicantUserId: string,
  body: string
): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const text = (body ?? "").trim();
  if (!text) return { ok: false, error: "EMPTY" };
  await deliverAdminMessageToApplicant({
    applicantUserId,
    adminUserId: session.user.id,
    body: text.slice(0, 4000),
  });
  return { ok: true };
}
