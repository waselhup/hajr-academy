import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/teacher-earnings/bulk-approve
 * Body: { ids: string[] }
 * Approves all PENDING earnings in the given id list.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const body = await req.json();
  const ids = Array.isArray(body.ids) ? body.ids.filter((x: any) => typeof x === "string") : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  const result = await prisma.teacherEarning.updateMany({
    where: { id: { in: ids }, status: "PENDING" },
    data: {
      status: "APPROVED",
      approvedBy: session.user.id,
      approvedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "TEACHER_EARNING_BULK_APPROVED",
      entity: "TeacherEarning",
      metadata: { ids, count: result.count },
    },
  });

  return NextResponse.json({ ok: true, count: result.count });
}
