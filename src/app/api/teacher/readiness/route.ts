/**
 * Sprint 3 — Teacher readiness self-submission.
 *
 * GET   /api/teacher/readiness  — fetch own row
 * PATCH /api/teacher/readiness  — submit checklist + self-rating
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tp = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    include: { readiness: true },
  });
  if (!tp) return NextResponse.json({ error: "No profile" }, { status: 404 });
  return NextResponse.json({ readiness: tp.readiness, teacherId: tp.id });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    zoomTested?: boolean;
    digitalToolsOk?: boolean;
    mockClassDone?: boolean;
    interactiveOk?: boolean;
    classroomMgmt?: boolean;
    selfRating?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tp = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!tp) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const selfRating =
    typeof body.selfRating === "number" && body.selfRating >= 1 && body.selfRating <= 5
      ? body.selfRating
      : undefined;

  const data = {
    zoomTested: Boolean(body.zoomTested),
    digitalToolsOk: Boolean(body.digitalToolsOk),
    mockClassDone: Boolean(body.mockClassDone),
    interactiveOk: Boolean(body.interactiveOk),
    classroomMgmt: Boolean(body.classroomMgmt),
    selfRating,
  };

  const existing = await prisma.teacherReadiness.findUnique({
    where: { teacherId: tp.id },
  });

  const row = existing
    ? await prisma.teacherReadiness.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.teacherReadiness.create({
        data: { ...data, teacherId: tp.id },
      });

  await audit.mutation(
    session.user.id,
    "TEACHER_READINESS_SUBMITTED",
    "TeacherReadiness",
    row.id,
    data
  );

  const allComplete =
    data.zoomTested &&
    data.digitalToolsOk &&
    data.mockClassDone &&
    data.interactiveOk &&
    data.classroomMgmt;
  if (allComplete && !row.adminVerified) {
    // Tell admins something is ready to verify.
    await notifyAdmins({
      type: "SYSTEM_ANNOUNCEMENT",
      title: "Teacher ready for verification",
      titleAr: "معلم جاهز للاعتماد",
      body: "A teacher completed their readiness checklist.",
      bodyAr: "أكمل أحد المعلمين قائمة الجاهزية.",
      channels: ["inApp"],
      actionUrl: `/admin/teachers/${tp.id}/readiness`,
      refType: "TeacherReadiness",
      refId: row.id,
    });
  }

  return NextResponse.json({ readiness: row });
}
