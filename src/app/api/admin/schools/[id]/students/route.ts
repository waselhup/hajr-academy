import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/schools/[id]/students — tag students as belonging to a
 * partner school (bulk). Body: { studentIds: string[] }. The students'
 * `schoolId` is set so they appear in the school's roster and reports.
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
    const school = await prisma.partnerSchool.findUnique({
      where: { id: params.id },
      include: { _count: { select: { students: true } } },
    });
    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const body = await req.json();
    const studentIds: string[] = Array.isArray(body.studentIds)
      ? body.studentIds.filter((s: unknown) => typeof s === "string")
      : [];
    if (studentIds.length === 0) {
      return NextResponse.json(
        { error: "studentIds is required" },
        { status: 400 }
      );
    }

    // Respect the school's student cap.
    const capacityLeft = school.studentCap - school._count.students;
    const accepted = studentIds.slice(0, Math.max(0, capacityLeft));

    const result = await prisma.studentProfile.updateMany({
      where: { id: { in: accepted } },
      data: { schoolId: params.id },
    });

    await logAudit({
      userId: session.user.id,
      action: "SCHOOL_STUDENTS_ADDED",
      entity: "PartnerSchool",
      entityId: params.id,
      metadata: { added: result.count, requested: studentIds.length },
    });

    return NextResponse.json({
      ok: true,
      added: result.count,
      rejectedFull: studentIds.length - accepted.length,
    });
  } catch (e) {
    console.error("[admin/schools/[id]/students] failed:", e);
    return NextResponse.json(
      { ok: false, error: "Could not add students" },
      { status: 500 }
    );
  }
}
