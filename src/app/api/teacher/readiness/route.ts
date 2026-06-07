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
import { KNOWN_TOOLS } from "@/lib/teacher/readiness-tools";

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
    interactiveTools?: unknown;
    interactiveToolsOther?: unknown;
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

  // F4 — store only recognized tool keys; cap the "other" free-text.
  const interactiveToolsList = Array.isArray(body.interactiveTools)
    ? [...new Set(body.interactiveTools.filter((x): x is string => typeof x === "string" && (KNOWN_TOOLS as readonly string[]).includes(x)))]
    : [];
  const interactiveToolsOther =
    typeof body.interactiveToolsOther === "string" && body.interactiveToolsOther.trim()
      ? body.interactiveToolsOther.trim().slice(0, 200)
      : null;

  const data = {
    zoomTested: Boolean(body.zoomTested),
    digitalToolsOk: Boolean(body.digitalToolsOk),
    mockClassDone: Boolean(body.mockClassDone),
    // "interactive tools" is now satisfied when at least one tool is named.
    interactiveOk: interactiveToolsList.length > 0 || interactiveToolsOther !== null,
    interactiveToolsList,
    interactiveToolsOther,
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
