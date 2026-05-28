/**
 * GET  /api/library/items   — list published items (any logged-in user)
 * POST /api/library/items   — create item (ADMIN, SUPER_ADMIN, TEACHER)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import type {
  LibraryItemType,
  LibrarySkillLevel,
  LibraryAgeTier,
} from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const url = new URL(req.url);
  const type = url.searchParams.get("type") as LibraryItemType | null;
  const skillLevel = url.searchParams.get("skillLevel") as LibrarySkillLevel | null;
  const ageTier = url.searchParams.get("ageTier") as LibraryAgeTier | null;
  const q = url.searchParams.get("q")?.trim();
  const role = session.user.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  try {
    const items = await prisma.libraryItem.findMany({
      where: {
        ...(isAdmin ? {} : { isPublished: true }),
        ...(type ? { type } : {}),
        ...(skillLevel ? { skillLevel } : {}),
        ...(ageTier ? { targetAgeTier: ageTier } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { titleAr: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { tags: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error("[library/items GET]", e);
    return NextResponse.json({ ok: true, items: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN", "TEACHER");
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    titleAr?: string;
    description?: string;
    descriptionAr?: string;
    type?: LibraryItemType;
    skillLevel?: LibrarySkillLevel;
    targetAgeTier?: LibraryAgeTier;
    contentUrl?: string;
    contentHtml?: string;
    durationMinutes?: number;
    thumbnailUrl?: string;
    tags?: string[];
    isPublished?: boolean;
    exerciseData?: unknown;
  };

  if (!body.title || !body.titleAr || !body.type) {
    return NextResponse.json(
      { ok: false, error: "title, titleAr, type required" },
      { status: 400 }
    );
  }

  const item = await prisma.libraryItem.create({
    data: {
      title: body.title,
      titleAr: body.titleAr,
      description: body.description ?? null,
      descriptionAr: body.descriptionAr ?? null,
      type: body.type,
      skillLevel: body.skillLevel ?? "ALL",
      targetAgeTier: body.targetAgeTier ?? "ALL",
      contentUrl: body.contentUrl ?? null,
      contentHtml: body.contentHtml ?? null,
      durationMinutes: body.durationMinutes ?? 5,
      thumbnailUrl: body.thumbnailUrl ?? null,
      authorId: session.user.id,
      isPublished: body.isPublished ?? false,
      publishedAt: body.isPublished ? new Date() : null,
      exerciseData: (body.exerciseData ?? null) as never,
      tags: body.tags?.length
        ? {
            create: body.tags
              .filter((t) => t && t.trim())
              .map((t) => ({ tag: t.trim().toLowerCase() })),
          }
        : undefined,
    },
    include: { tags: true },
  });

  await audit.mutation(session.user.id, "LIBRARY_ITEM_CREATED", "LibraryItem", item.id, {
    type: item.type,
    title: item.title,
  });

  return NextResponse.json({ ok: true, item });
}
