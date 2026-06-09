import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/teachers/[id]/admin-rating
 * Body: { rating: number | null }
 *
 * Sets TeacherProfile.adminRating — the admin-entered rating (1..5) that feeds
 * the combined-average column on the admin ratings table. `null` clears it.
 * Server-enforced: admins only, integer 1..5 or null.
 *
 * NOTE: the dynamic segment is [id] (not [teacherId]) to match the sibling
 * routes [id]/rate and [id]/readiness — Next.js forbids differing slug names at
 * the same path level. The id IS the TeacherProfile id.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const { id: teacherId } = await params;

  const body = await req.json().catch(() => ({}));
  const raw = (body as { rating?: unknown }).rating;

  // Accept null (clear) or an integer 1..5. Reject anything else.
  let rating: number | null;
  if (raw === null) {
    rating = null;
  } else {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return NextResponse.json(
        { error: "rating must be an integer 1..5 or null" },
        { status: 400 }
      );
    }
    rating = n;
  }

  const existing = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: { id: true, adminRating: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  await prisma.teacherProfile.update({
    where: { id: teacherId },
    data: { adminRating: rating },
  });

  await audit.mutation(
    session.user.id,
    "TEACHER_ADMIN_RATING_UPDATED",
    "TeacherProfile",
    teacherId,
    { previous: existing.adminRating, next: rating }
  );

  return NextResponse.json({ ok: true });
}
