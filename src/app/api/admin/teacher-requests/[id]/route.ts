import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ALLOWED = ["PENDING", "CONTACTED", "CLOSED"] as const;

/**
 * POST /api/admin/teacher-requests/[id]
 * Body: { status: "PENDING" | "CONTACTED" | "CLOSED" }
 * Admin-only status update for a student's teacher request (owner batch 5 #9).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const status = String((body as { status?: unknown }).status ?? "");
  if (!(ALLOWED as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.teacherRequest.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.teacherRequest.update({ where: { id }, data: { status } });
  await audit.mutation(session.user.id, "TEACHER_REQUEST_STATUS_UPDATED", "TeacherRequest", id, {
    previous: existing.status,
    next: status,
  });

  return NextResponse.json({ ok: true });
}
