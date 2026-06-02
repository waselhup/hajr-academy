"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { OpeningAudienceType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import {
  selectApplicant,
  shortlistApplicant,
  rejectApplicant,
  reopenOpening,
  closeOpening,
  setOpeningAudience,
  openApplicantsPhase,
  listTeachersForPicker,
  previewOpeningAudience,
  type TeacherFilter,
  type TeacherPickRow,
} from "@/lib/openings/service";

/**
 * Admin-side thin wrappers over the openings service. RBAC + revalidate only;
 * the service is the single source of truth for state, notify() and audit.
 */
type Result = { ok: true } | { ok: false; error: string };

const noteSchema = z.string().trim().max(4000).optional();

/** Revalidate both the openings list and a specific opening detail page. */
function revalidateOpening(openingId: string | null) {
  revalidatePath("/admin/openings");
  if (openingId) revalidatePath(`/admin/openings/${openingId}`);
}

/** Resolve an application's openingId (minimal select) for the revalidate path. */
async function openingIdForApplication(applicationId: string): Promise<string | null> {
  const app = await prisma.teacherApplication.findUnique({
    where: { id: applicationId },
    select: { openingId: true },
  });
  return app?.openingId ?? null;
}

export async function selectApplicantAction(
  applicationId: string,
  decisionNote?: string
): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const note = noteSchema.safeParse(decisionNote);
  if (!note.success) return { ok: false, error: "VALIDATION" };

  const res = await selectApplicant({
    applicationId,
    reviewerUserId: session.user.id,
    decisionNote: note.data,
  });
  revalidateOpening(await openingIdForApplication(applicationId));
  return res;
}

export async function shortlistApplicantAction(applicationId: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const res = await shortlistApplicant({
    applicationId,
    reviewerUserId: session.user.id,
  });
  revalidateOpening(await openingIdForApplication(applicationId));
  return res;
}

export async function rejectApplicantAction(
  applicationId: string,
  decisionNote?: string
): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const note = noteSchema.safeParse(decisionNote);
  if (!note.success) return { ok: false, error: "VALIDATION" };

  const res = await rejectApplicant({
    applicationId,
    reviewerUserId: session.user.id,
    decisionNote: note.data,
  });
  revalidateOpening(await openingIdForApplication(applicationId));
  return res;
}

export async function reopenOpeningAction(openingId: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const res = await reopenOpening({ openingId, reviewerUserId: session.user.id });
  revalidateOpening(openingId);
  return res;
}

export async function closeOpeningAction(openingId: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const res = await closeOpening({ openingId, reviewerUserId: session.user.id });
  revalidateOpening(openingId);
  return res;
}

// ─────────────────────────── AUDIENCE (targeted openings) ───────────────────────────

const AUDIENCE_TYPES = [
  "SELECTED_TEACHERS",
  "ALL_INTERNAL",
  "APPLICANTS_ONLY",
  "INTERNAL_THEN_APPLICANTS",
  "EVERYONE",
] as const;

const teacherFilterSchema = z
  .object({
    gender: z.enum(["MALE", "FEMALE"]).nullable().optional(),
    specializations: z.array(z.string().max(120)).max(50).optional(),
    activeOnly: z.boolean().optional(),
    minRating: z.number().min(0).max(5).nullable().optional(),
    maxLoad: z.number().int().min(0).max(100000).nullable().optional(),
  })
  .optional();

const setAudienceSchema = z.object({
  openingId: z.string().min(1),
  audienceType: z.enum(AUDIENCE_TYPES),
  // SELECTED_TEACHERS: explicit picks + the filter snapshot used to build them.
  teacherIds: z.array(z.string().min(1)).max(1000).optional(),
  filter: teacherFilterSchema,
});

/**
 * Set/replace an opening's audience (the authoring + re-target action). For
 * SELECTED_TEACHERS we persist a snapshot { teacherIds, filter } as
 * audienceConfig; the service materialises new members + notifies ONLY the
 * newcomers. Widening an existing opening never re-pings prior members.
 */
export async function setOpeningAudienceAction(
  input: z.infer<typeof setAudienceSchema>
): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = setAudienceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };

  const { openingId, audienceType, teacherIds, filter } = parsed.data;

  // Guard: SELECTED_TEACHERS must name at least one teacher.
  if (audienceType === "SELECTED_TEACHERS" && (!teacherIds || teacherIds.length === 0)) {
    return { ok: false, error: "NO_TEACHERS_SELECTED" };
  }

  const audienceConfig: Prisma.InputJsonValue | undefined =
    audienceType === "SELECTED_TEACHERS"
      ? { teacherIds: teacherIds ?? [], filter: (filter ?? {}) as Prisma.InputJsonValue }
      : undefined;

  const res = await setOpeningAudience({
    openingId,
    reviewerUserId: session.user.id,
    audienceType: audienceType as OpeningAudienceType,
    audienceConfig,
  });
  revalidateOpening(openingId);
  return res;
}

/**
 * Explicitly open phase 2 of an INTERNAL_THEN_APPLICANTS opening (reveal to
 * external applicants). The system never does this automatically — it is always
 * this deliberate admin action, behind a confirm dialog in the UI.
 */
export async function openApplicantsPhaseAction(openingId: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const res = await openApplicantsPhase({ openingId, reviewerUserId: session.user.id });
  revalidateOpening(openingId);
  return res;
}

/** Reusable picker data source — list teachers matching a filter (read-only). */
export async function listTeachersForPickerAction(
  filter?: TeacherFilter
): Promise<{ ok: true; data: TeacherPickRow[] } | { ok: false; error: string }> {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = teacherFilterSchema.safeParse(filter);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const data = await listTeachersForPicker((parsed.data ?? {}) as TeacherFilter);
  return { ok: true, data };
}

/**
 * Preview the exact NAMED audience an opening will reach right now — transparency
 * (no black-box numbers). Reads the opening's current audience + phase.
 */
export async function previewOpeningAudienceAction(openingId: string): Promise<
  | { ok: true; data: Awaited<ReturnType<typeof previewOpeningAudience>> }
  | { ok: false; error: string }
> {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const opening = await prisma.programOpening.findUnique({
    where: { id: openingId },
    select: { id: true, audienceType: true, applicantsPhaseOpen: true },
  });
  if (!opening) return { ok: false, error: "NOT_FOUND" };
  const data = await previewOpeningAudience(opening);
  return { ok: true, data };
}
