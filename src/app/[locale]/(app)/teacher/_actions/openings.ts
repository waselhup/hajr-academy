"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/rbac";
import { withdrawApplication } from "@/lib/openings/service";

/**
 * Teacher-side thin wrapper: a teacher withdraws their own application. The
 * service enforces ownership and is the single source of truth for audit.
 */
type Result = { ok: true } | { ok: false; error: string };

export async function withdrawApplicationAction(applicationId: string): Promise<Result> {
  const session = await requireRole("TEACHER");
  const res = await withdrawApplication({
    applicationId,
    teacherUserId: session.user.id,
  });
  revalidatePath("/teacher/openings");
  return res;
}
