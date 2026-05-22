import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { triggerEnrollmentConfirmed } from "@/lib/comms/triggers";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/students/bulk-assign — enroll several students into one
 * class at once. Skips students already actively enrolled; respects the
 * class capacity. Body: { classId, studentIds: string[] }.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const classId = typeof body.classId === "string" ? body.classId : "";
    const studentIds: string[] = Array.isArray(body.studentIds)
      ? body.studentIds.filter((s: unknown) => typeof s === "string")
      : [];

    if (!classId || studentIds.length === 0) {
      return NextResponse.json(
        { error: "classId and studentIds are required" },
        { status: 400 }
      );
    }

    const klass = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: { select: { userId: true } },
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      },
    });
    if (!klass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Existing active enrollments in this class.
    const existing = await prisma.enrollment.findMany({
      where: { classId, studentId: { in: studentIds } },
    });
    const activeIds = new Set(
      existing.filter((e) => e.status === "ACTIVE").map((e) => e.studentId)
    );
    const reactivatable = existing.filter((e) => e.status !== "ACTIVE");

    const toEnroll = studentIds.filter((id) => !activeIds.has(id));
    let capacityLeft = klass.maxStudents - klass._count.enrollments;
    const accepted = toEnroll.slice(0, Math.max(0, capacityLeft));
    const rejected = toEnroll.slice(Math.max(0, capacityLeft));

    let enrolled = 0;
    for (const studentId of accepted) {
      const prior = reactivatable.find((e) => e.studentId === studentId);
      if (prior) {
        await prisma.enrollment.update({
          where: { id: prior.id },
          data: { status: "ACTIVE" },
        });
      } else {
        await prisma.enrollment.create({
          data: { studentId, classId, status: "ACTIVE" },
        });
      }
      enrolled++;

      // Notify the student (best-effort).
      try {
        const sp = await prisma.studentProfile.findUnique({
          where: { id: studentId },
          select: { userId: true },
        });
        if (sp) {
          await triggerEnrollmentConfirmed(
            sp.userId,
            klass.nameAr ?? klass.name
          );
        }
      } catch {
        /* notification failure must not abort the batch */
      }
    }

    await logAudit({
      userId: session.user.id,
      action: "STUDENTS_BULK_ASSIGNED",
      entity: "Class",
      entityId: classId,
      metadata: { enrolled, skipped: activeIds.size, rejectedFull: rejected.length },
    });

    return NextResponse.json({
      ok: true,
      enrolled,
      alreadyEnrolled: activeIds.size,
      rejectedFull: rejected.length,
    });
  } catch (e) {
    console.error("[admin/students/bulk-assign] failed:", e);
    return NextResponse.json(
      { ok: false, error: "Bulk assignment failed" },
      { status: 500 }
    );
  }
}
