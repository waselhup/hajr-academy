"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { StickyNote, StickyNoteColor } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

/**
 * C5 — Personal reminder "sticky notes" for admins.
 *
 * Every action is admin-gated (requireRole) AND scoped to the calling admin's
 * own user id. A note is private to its owner: reads filter by ownerId, and
 * mutations (toggle/delete) verify ownerId === session.user.id BEFORE touching
 * the row, so one admin can never see or modify another admin's notes.
 */

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

// Plain shape sent to the client component (Date → ISO string).
export type StickyNoteDTO = {
  id: string;
  body: string;
  color: StickyNoteColor;
  done: boolean;
  dueAt: string | null;
  createdAt: string;
};

const COLORS = ["YELLOW", "GREEN", "BLUE", "PINK", "PURPLE"] as const;

const createSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  color: z.enum(COLORS).optional(),
  // datetime-local sends "YYYY-MM-DDTHH:mm"; allow empty/undefined too.
  dueAt: z.string().trim().min(1).optional().nullable(),
});

function toDTO(n: StickyNote): StickyNoteDTO {
  return {
    id: n.id,
    body: n.body,
    color: n.color,
    done: n.done,
    dueAt: n.dueAt ? n.dueAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  };
}

/** List the calling admin's own notes (open first, newest first). */
export async function listMyNotes(): Promise<Result<StickyNoteDTO[]>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  try {
    const notes = await prisma.stickyNote.findMany({
      where: { ownerId: session.user.id },
      orderBy: [{ done: "asc" }, { createdAt: "desc" }],
    });
    return { ok: true, data: notes.map(toDTO) };
  } catch (e) {
    console.error("[sticky-notes] listMyNotes failed:", e);
    return { ok: false, error: "LOAD_FAILED" };
  }
}

/** Create a note owned by the calling admin. */
export async function createNote(
  input: z.infer<typeof createSchema>
): Promise<Result<StickyNoteDTO>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };

  let dueAt: Date | null = null;
  if (parsed.data.dueAt) {
    const d = new Date(parsed.data.dueAt);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "VALIDATION" };
    dueAt = d;
  }

  try {
    const created = await prisma.stickyNote.create({
      data: {
        ownerId: session.user.id,
        body: parsed.data.body,
        color: parsed.data.color ?? "YELLOW",
        dueAt,
      },
    });
    revalidatePath("/admin");
    return { ok: true, data: toDTO(created) };
  } catch (e) {
    console.error("[sticky-notes] createNote failed:", e);
    return { ok: false, error: "CREATE_FAILED" };
  }
}

/** Flip a note's done flag — only if it belongs to the calling admin. */
export async function toggleNote(id: string): Promise<Result<StickyNoteDTO>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  if (!id) return { ok: false, error: "VALIDATION" };
  try {
    const existing = await prisma.stickyNote.findUnique({
      where: { id },
      select: { ownerId: true, done: true },
    });
    // Never reveal or touch another admin's note: treat as not-found.
    if (!existing || existing.ownerId !== session.user.id) {
      return { ok: false, error: "NOT_FOUND" };
    }
    const updated = await prisma.stickyNote.update({
      where: { id },
      data: { done: !existing.done },
    });
    revalidatePath("/admin");
    return { ok: true, data: toDTO(updated) };
  } catch (e) {
    console.error("[sticky-notes] toggleNote failed:", e);
    return { ok: false, error: "UPDATE_FAILED" };
  }
}

/** Delete a note — only if it belongs to the calling admin. */
export async function deleteNote(id: string): Promise<Result<{ id: string }>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  if (!id) return { ok: false, error: "VALIDATION" };
  try {
    const existing = await prisma.stickyNote.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!existing || existing.ownerId !== session.user.id) {
      return { ok: false, error: "NOT_FOUND" };
    }
    await prisma.stickyNote.delete({ where: { id } });
    revalidatePath("/admin");
    return { ok: true, data: { id } };
  } catch (e) {
    console.error("[sticky-notes] deleteNote failed:", e);
    return { ok: false, error: "DELETE_FAILED" };
  }
}
