/**
 * POST /api/student/teacher-requests
 *   — a student requests a specific (active) teacher for a one-to-one (PRIVATE)
 *     course from the "Available teachers" discovery section. Creates a
 *     TeacherRequest row and notifies every admin (in-app).
 *
 * Server-enforced: identity comes from the session (never the client). The
 * teacher must be an active teacher; the optional program (if given) must be a
 * PRIVATE active program. NO salary/rate/PII is read or returned.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("STUDENT");

    const sp = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, user: { select: { name: true, nameAr: true } } },
    });
    if (!sp) {
      return NextResponse.json({ ok: false, error: "no profile" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const teacherId = String(body.teacherId ?? "").trim();
    const programIdRaw = String(body.programId ?? "").trim();
    const messageRaw = String(body.message ?? "").trim();

    if (!teacherId) {
      return NextResponse.json({ ok: false, error: "teacherId required" }, { status: 400 });
    }
    if (messageRaw.length > 2000) {
      return NextResponse.json({ ok: false, error: "message too long" }, { status: 400 });
    }

    // Teacher must exist and be active (both profile + account).
    const teacher = await prisma.teacherProfile.findFirst({
      where: { id: teacherId, active: true, user: { isActive: true } },
      select: { id: true, user: { select: { name: true, nameAr: true } } },
    });
    if (!teacher) {
      return NextResponse.json({ ok: false, error: "teacher not found" }, { status: 404 });
    }

    // Optional program — if provided, must be an active PRIVATE (1:1) program.
    let programId: string | null = null;
    let programName: string | null = null;
    if (programIdRaw) {
      const program = await prisma.program.findFirst({
        where: { id: programIdRaw, type: "PRIVATE", active: true },
        select: { id: true, nameEn: true, nameAr: true },
      });
      if (!program) {
        return NextResponse.json({ ok: false, error: "invalid program" }, { status: 400 });
      }
      programId = program.id;
      programName = program.nameEn;
    }

    const request = await prisma.teacherRequest.create({
      data: {
        studentId: sp.id,
        teacherId: teacher.id,
        programId,
        message: messageRaw || null,
      },
      select: { id: true },
    });

    const studentName = sp.user.name;
    const studentNameAr = sp.user.nameAr ?? sp.user.name;
    const teacherName = teacher.user.name;
    const teacherNameAr = teacher.user.nameAr ?? teacher.user.name;
    const programSuffix = programName ? ` — ${programName}` : "";
    const programSuffixAr = programName ? ` — ${programName}` : "";

    await notifyAdmins({
      type: "TRIAL_REQUEST",
      title: "Teacher request",
      titleAr: "طلب معلّم",
      body: `${studentName} requested ${teacherName} for a one-to-one course${programSuffix}.`,
      bodyAr: `${studentNameAr} طلب المعلّم ${teacherNameAr} لدورة فردية${programSuffixAr}.`,
      channels: ["inApp"],
      actionUrl: "/admin/teacher-requests",
      actionLabel: "Review",
      actionLabelAr: "مراجعة",
      priority: "NORMAL",
      refType: "TeacherRequest",
      refId: request.id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
