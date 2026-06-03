/**
 * Per-class private teaching-materials library — shared server logic.
 *
 * A teacher uploads lesson plans, exercises, slides, photos, videos and
 * documents that live WITH the class. Because they hang off the class (not a
 * term/cohort), a returning or future assigned teacher reopens the class and
 * finds everything ready to reuse.
 *
 * Storage: the private `class-resources` bucket. We persist the storage PATH
 * in `url`; the access-controlled fetch endpoint signs it on demand so a
 * leaked link cannot be replayed indefinitely.
 *
 * We deliberately REUSE the assignment attachment primitives — `AttachmentKind`,
 * magic-byte detection, the size ceilings and `humanSize` — rather than
 * reinvent them. `kind` is the storage-level class (VIDEO/AUDIO/FILE); the
 * finer display type (PDF / image / slides / document) is derived from the
 * mime type in the UI. `category` is the teacher-chosen folder chip.
 *
 * SECURITY/PDPL: access is decided **server-side only**.
 *   - list / fetch  → a teacher currently assigned to the class, or an admin
 *   - rename/delete → the uploader, or an admin
 * Never trust the client.
 */
import type { ClassResourceCategory, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdminish } from "@/lib/rbac";

/** Private bucket holding every class's teaching materials. */
export const CLASS_RESOURCE_BUCKET = "class-resources";

export const RESOURCE_CATEGORIES: ClassResourceCategory[] = [
  "LESSON_PLAN",
  "EXERCISE",
  "SLIDES",
  "OTHER",
];

export function isValidCategory(v: unknown): v is ClassResourceCategory {
  return typeof v === "string" && (RESOURCE_CATEGORIES as string[]).includes(v);
}

export interface Actor {
  userId: string;
  role: Role;
}

/**
 * May this actor LIST / FETCH resources for a class?
 *   - admins: always
 *   - the teacher currently assigned to the class (class.teacherId →
 *     TeacherProfile.userId === actor.userId)
 *
 * Class-scoped on purpose: a teacher reassigned to the class later sees all
 * prior resources, which is the whole point of persisting them with the class.
 */
export async function canAccessClassResources(
  classId: string,
  actor: Actor,
): Promise<boolean> {
  if (isAdminish(actor.role)) return true;
  if (actor.role !== "TEACHER") return false;

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { teacher: { select: { userId: true } } },
  });
  return !!cls && cls.teacher?.userId === actor.userId;
}

/**
 * May this actor MANAGE (rename/delete) a specific resource?
 *   - admins: always
 *   - the uploader (only the teacher who added it may change or remove it)
 *
 * Returns the resource row when allowed (so callers avoid a second query),
 * or null when not found / not permitted.
 */
export async function getManageableResource(
  resourceId: string,
  actor: Actor,
): Promise<{ id: string; classId: string; url: string; uploadedByUserId: string } | null> {
  const res = await prisma.classResource.findUnique({
    where: { id: resourceId },
    select: { id: true, classId: true, url: true, uploadedByUserId: true },
  });
  if (!res) return null;
  if (isAdminish(actor.role)) return res;
  if (actor.role === "TEACHER" && res.uploadedByUserId === actor.userId) return res;
  return null;
}
