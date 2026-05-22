import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { triggerStudentTransferred } from "@/lib/comms/triggers";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/students/[id]/transfer — move a student between classes.
 *
 * Body: { fromClassId?, toClassId, reason? }. The old enrollment is set
 * DROPPED, a new ACTIVE enrollment is created, and the student, parents,
 * and the receiving teacher are notified. Every move is audit-logged.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const studentId = params.id;
    const body = await req.json();
    const toClassId = typeof body.toClassId === "string" ? body.toClassId : "";
    const fromClassId =
      typeof body.fromClassId === "string" ? body.fromClassId : null;
    const reason = typeof body.reason === "string" ? body.reason : null;

    if (!toClassId) {
      return NextResponse.json(
        { error: "toClassId is required" },
        { status: 400 }
      );
    }

    const [student, toClass] = await Promise.all([
      prisma.studentProfile.findUnique({
        where: { id: studentId },
        select: { id: true },
      }),
      prisma.class.findUnique({
        where: { id: toClassId },
        include: {
          teacher: { select: { userId: true } },
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
        },
      }),
    ]);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    if (!toClass) {
      return NextResponse.json(
        { error: "Target class not found" },
        { status: 404 }
      );
    }

    // Already in the target class?
    const existingInTarget = await prisma.enrollment.findUnique({
      where: { studentId_classId: { studentId, classId: toClassId } },
    });
    if (existingInTarget && existingInTarget.status === "ACTIVE") {
      return NextResponse.json(
        { error: "Student is already enrolled in this class" },
        { status: 400 }
      );
    }

    // Capacity check.
    if (toClass._count.enrollments >= toClass.maxStudents) {
      return NextResponse.json(
        { error: "Target class is full" },
        { status: 400 }
      );
    }

    // Deactivate the source enrollment(s).
    const deactivateWhere = fromClassId
      ? { studentId, classId: fromClassId, status: "ACTIVE" as const }
      : { studentId, status: "ACTIVE" as const };
    await prisma.enrollment.updateMany({
      where: deactivateWhere,
      data: { status: "DROPPED" },
    });

    // Create or reactivate the target enrollment.
    if (existingInTarget) {
      await prisma.enrollment.update({
        where: { id: existingInTarget.id },
        data: { status: "ACTIVE" },
      });
    } else {
      await prisma.enrollment.create({
        data: { studentId, classId: toClassId, status: "ACTIVE" },
      });
    }

    await logAudit({
      userId: session.user.id,
      action: "STUDENT_TRANSFERRED",
      entity: "StudentProfile",
      entityId: studentId,
      metadata: { fromClassId, toClassId, reason },
    });

    // Notify student, parents, and the receiving teacher (best-effort).
    try {
      await triggerStudentTransferred({
        studentProfileId: studentId,
        newClassName: toClass.nameAr ?? toClass.name,
        newTeacherUserId: toClass.teacher.userId,
      });
    } catch (e) {
      console.error("[students/transfer] notifications failed:", e);
    }

    return NextResponse.json({ ok: true, toClassId });
  } catch (e) {
    console.error("[admin/students/[id]/transfer] failed:", e);
    return NextResponse.json(
      { ok: false, error: "Transfer failed" },
      { status: 500 }
    );
  }
}
