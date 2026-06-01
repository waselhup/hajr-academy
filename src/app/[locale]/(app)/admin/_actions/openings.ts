"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import {
  selectApplicant,
  shortlistApplicant,
  rejectApplicant,
  reopenOpening,
  closeOpening,
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
