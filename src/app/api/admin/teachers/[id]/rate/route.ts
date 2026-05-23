import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/teachers/[id]/rate
 * Body: { hourlyRate: number }
 * Sets the hourly rate for a TeacherProfile.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const rate = Number(body.hourlyRate);
  if (!Number.isFinite(rate) || rate < 0) {
    return NextResponse.json({ error: "Invalid hourlyRate" }, { status: 400 });
  }

  const existing = await prisma.teacherProfile.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  const updated = await prisma.teacherProfile.update({
    where: { id },
    data: { hourlyRate: rate },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "TEACHER_RATE_UPDATED",
      entity: "TeacherProfile",
      entityId: id,
      metadata: { previous: Number(existing.hourlyRate), next: rate },
    },
  });

  return NextResponse.json({ ok: true, hourlyRate: Number(updated.hourlyRate) });
}
