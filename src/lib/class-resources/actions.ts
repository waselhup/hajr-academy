"use server";

/**
 * Class-resource server actions — rename + delete a teacher's private class
 * material. Both are server-gated to the uploader (or an admin) via
 * `getManageableResource`, audited, and revalidate the class page.
 *
 * Upload happens through the route (/api/class-resources/upload) because it
 * streams a file; these actions cover the lightweight metadata edits and
 * removal, which also deletes the underlying storage object.
 */
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { createSupabaseServiceClient } from "@/lib/supabase";
import {
  CLASS_RESOURCE_BUCKET,
  getManageableResource,
  isValidCategory,
} from "@/lib/class-resources/resources";
import type { ClassResourceCategory } from "@prisma/client";

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

function revalidateClass(classId: string) {
  // Locale-prefixed route; revalidate both locales' detail pages.
  revalidatePath(`/ar/teacher/classes/${classId}`);
  revalidatePath(`/en/teacher/classes/${classId}`);
}

/** Rename a resource (and optionally recategorize it). Uploader/admin only. */
export async function renameClassResourceAction(input: {
  resourceId: string;
  title: string;
  category?: ClassResourceCategory;
}): Promise<Result> {
  const session = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
  const actor = { userId: session.user.id, role: session.user.role };

  const title = (input.title ?? "").trim();
  if (title.length < 1) return { ok: false, error: "TITLE_REQUIRED" };

  const res = await getManageableResource(input.resourceId, actor);
  if (!res) return { ok: false, error: "FORBIDDEN" };

  const category = isValidCategory(input.category) ? input.category : undefined;

  await prisma.classResource.update({
    where: { id: res.id },
    data: { title: title.slice(0, 160), ...(category ? { category } : {}) },
  });

  await audit.mutation(session.user.id, "CLASS_RESOURCE_RENAMED", "ClassResource", res.id, {
    title: title.slice(0, 160),
    category: category ?? null,
  });

  revalidateClass(res.classId);
  return { ok: true };
}

/** Delete a resource + its storage object. Uploader/admin only. */
export async function deleteClassResourceAction(input: {
  resourceId: string;
}): Promise<Result> {
  const session = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
  const actor = { userId: session.user.id, role: session.user.role };

  const res = await getManageableResource(input.resourceId, actor);
  if (!res) return { ok: false, error: "FORBIDDEN" };

  // Best-effort storage cleanup first; the row is the source of truth either way.
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.storage.from(CLASS_RESOURCE_BUCKET).remove([res.url]);
  } catch (e) {
    console.error("[class-resources] storage delete failed (non-fatal):", e);
  }

  await prisma.classResource.delete({ where: { id: res.id } });

  await audit.mutation(session.user.id, "CLASS_RESOURCE_DELETED", "ClassResource", res.id, {
    classId: res.classId,
  });

  revalidateClass(res.classId);
  return { ok: true };
}
