/**
 * Sprint 3 — Admin verifies a teacher's readiness.
 *
 * PATCH /api/admin/teachers/[id]/readiness
 *   body: { adminVerified, adminNotes?, override? (checklist) }
 *
 * `[id]` is the TeacherProfile.id.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

interface OverrideShape {
  zoomTested?: boolean;
  digitalToolsOk?: boolean;
  mockClassDone?: boolean;
  interactiveOk?: boolean;
  classroomMgmt?: boolean;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  let body: {
    adminVerified?: boolean;
    adminNotes?: string;
    override?: OverrideShape;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!teacher) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.adminVerified === "boolean") {
    update.adminVerified = body.adminVerified;
    update.verifiedById = body.adminVerified ? session.user.id : null;
    update.verifiedAt = body.adminVerified ? new Date() : null;
  }
  if (typeof body.adminNotes === "string") {
    update.adminNotes = body.adminNotes.slice(0, 4000);
  }
  if (body.override) {
    for (const key of [
      "zoomTested",
      "digitalToolsOk",
      "mockClassDone",
      "interactiveOk",
      "classroomMgmt",
    ] as const) {
      if (typeof body.override[key] === "boolean") {
        update[key] = body.override[key];
      }
    }
  }

  // Upsert.
  const existing = await prisma.teacherReadiness.findUnique({
    where: { teacherId: teacher.id },
  });
  const row = existing
    ? await prisma.teacherReadiness.update({
        where: { id: existing.id },
        data: update,
      })
    : await prisma.teacherReadiness.create({
        data: {
          teacherId: teacher.id,
          ...(update as Record<string, never>),
        },
      });

  // Mirror to TeacherProfile.isVerified.
  if (typeof body.adminVerified === "boolean") {
    await prisma.teacherProfile.update({
      where: { id: teacher.id },
      data: { isVerified: body.adminVerified },
    });
  }

  await audit.mutation(
    session.user.id,
    "TEACHER_READINESS_VERIFIED",
    "TeacherReadiness",
    row.id,
    update
  );

  // Notify the teacher of the verification result.
  if (typeof body.adminVerified === "boolean") {
    await notify({
      userId: teacher.user.id,
      type: "SYSTEM_ANNOUNCEMENT",
      title: body.adminVerified
        ? "You have been verified ✓"
        : "Verification status updated",
      titleAr: body.adminVerified
        ? "تم اعتمادك ✓"
        : "تم تحديث حالة الاعتماد",
      body: body.adminVerified
        ? "Congratulations — you are now a verified teacher."
        : "Your verification status was updated.",
      bodyAr: body.adminVerified
        ? "تهانينا — أنت الآن معلم معتمد."
        : "تم تحديث حالة الاعتماد الخاصة بك.",
      channels: ["inApp", "email"],
      actionUrl: "/teacher/readiness",
      refType: "TeacherReadiness",
      refId: row.id,
    });
  }

  return NextResponse.json({ readiness: row });
}
