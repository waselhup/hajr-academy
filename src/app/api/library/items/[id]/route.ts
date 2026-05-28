/**
 * PATCH  /api/library/items/[id] — update (ADMIN/SUPER_ADMIN, or original author)
 * DELETE /api/library/items/[id] — admin only
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN", "TEACHER");
  const { id } = await params;
  const existing = await prisma.libraryItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin && existing.authorId !== session.user.id) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Partial<{
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    skillLevel: never;
    targetAgeTier: never;
    contentUrl: string;
    contentHtml: string;
    durationMinutes: number;
    thumbnailUrl: string;
    isPublished: boolean;
    exerciseData: unknown;
  }>;

  const next = await prisma.libraryItem.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.titleAr !== undefined ? { titleAr: body.titleAr } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.descriptionAr !== undefined ? { descriptionAr: body.descriptionAr } : {}),
      ...(body.skillLevel ? { skillLevel: body.skillLevel } : {}),
      ...(body.targetAgeTier ? { targetAgeTier: body.targetAgeTier } : {}),
      ...(body.contentUrl !== undefined ? { contentUrl: body.contentUrl } : {}),
      ...(body.contentHtml !== undefined ? { contentHtml: body.contentHtml } : {}),
      ...(body.durationMinutes !== undefined ? { durationMinutes: body.durationMinutes } : {}),
      ...(body.thumbnailUrl !== undefined ? { thumbnailUrl: body.thumbnailUrl } : {}),
      ...(body.exerciseData !== undefined
        ? { exerciseData: body.exerciseData as never }
        : {}),
      ...(body.isPublished !== undefined
        ? {
            isPublished: body.isPublished,
            publishedAt:
              body.isPublished && !existing.publishedAt ? new Date() : existing.publishedAt,
          }
        : {}),
    },
  });

  await audit.mutation(session.user.id, "LIBRARY_ITEM_UPDATED", "LibraryItem", id);
  return NextResponse.json({ ok: true, item: next });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await params;
  try {
    await prisma.libraryItem.delete({ where: { id } });
    await audit.mutation(session.user.id, "LIBRARY_ITEM_DELETED", "LibraryItem", id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }
}
