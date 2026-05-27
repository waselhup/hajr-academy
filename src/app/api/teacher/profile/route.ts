/**
 * Sprint 3 — Teacher self-service profile edit.
 *
 * PATCH /api/teacher/profile
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tp = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!tp) return NextResponse.json({ error: "No profile" }, { status: 404 });
  return NextResponse.json({ teacher: tp });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    bio?: string;
    introVideoUrl?: string;
    languages?: string[];
    yearsExp?: number;
    specializations?: string[];
    publicSlug?: string;
    autoSlug?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { name: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "No profile" }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.bio === "string") update.bio = body.bio.slice(0, 4000);
  if (typeof body.introVideoUrl === "string") {
    update.introVideoUrl = body.introVideoUrl.slice(0, 500) || null;
  }
  if (Array.isArray(body.languages)) {
    update.languages = body.languages
      .map((x) => String(x).trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  if (typeof body.yearsExp === "number" && body.yearsExp >= 0 && body.yearsExp <= 80) {
    update.yearsExp = body.yearsExp;
  }
  if (Array.isArray(body.specializations)) {
    update.specializations = body.specializations
      .map((x) => String(x).trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  if (body.autoSlug) {
    update.publicSlug = await ensureUniqueSlug(slugify(existing.user.name), existing.id);
  } else if (typeof body.publicSlug === "string" && body.publicSlug.trim()) {
    const candidate = slugify(body.publicSlug);
    if (candidate.length < 3) {
      return NextResponse.json({ error: "Slug too short" }, { status: 400 });
    }
    update.publicSlug = await ensureUniqueSlug(candidate, existing.id);
  }

  const updated = await prisma.teacherProfile.update({
    where: { id: existing.id },
    data: update,
  });

  await audit.mutation(
    session.user.id,
    "TEACHER_PROFILE_UPDATED",
    "TeacherProfile",
    existing.id,
    update
  );

  return NextResponse.json({ teacher: updated });
}

async function ensureUniqueSlug(base: string, ownTeacherId: string): Promise<string> {
  let candidate = base || "teacher";
  let n = 1;
  // simple loop; capped at 20 attempts.
  while (n < 20) {
    const existing = await prisma.teacherProfile.findFirst({
      where: { publicSlug: candidate, NOT: { id: ownTeacherId } },
      select: { id: true },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}
