import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateLessonSummary } from "@/lib/ai/lesson-summary";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function userCanAccessSession(
  sessionUserId: string,
  userRole: string,
  classSessionId: string
) {
  if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") return true;
  const cs = await prisma.classSession.findUnique({
    where: { id: classSessionId },
    include: {
      class: {
        select: {
          teacher: { select: { userId: true } },
          enrollments: {
            where: { status: "ACTIVE" },
            select: { student: { select: { userId: true } } },
          },
        },
      },
    },
  });
  if (!cs) return false;
  if (cs.class.teacher.userId === sessionUserId) return true;
  if (cs.class.enrollments.some((e) => e.student.userId === sessionUserId))
    return true;
  // Parents — check parent relations
  if (userRole === "PARENT") {
    const parent = await prisma.parentProfile.findUnique({
      where: { userId: sessionUserId },
      include: {
        childLinks: {
          include: { student: { select: { userId: true } } },
        },
      },
    });
    if (parent) {
      const childUserIds = parent.childLinks.map((l) => l.student.userId);
      const enrolledUserIds = cs.class.enrollments.map(
        (e) => e.student.userId
      );
      if (childUserIds.some((id) => enrolledUserIds.includes(id))) return true;
    }
  }
  return false;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await params;
  const allowed = await userCanAccessSession(
    session.user.id,
    session.user.role,
    id
  );
  if (!allowed) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const summary = await prisma.lessonSummary.findUnique({
    where: { sessionId: id },
  });
  if (!summary) {
    return NextResponse.json({ summary: null });
  }
  return NextResponse.json({
    summary: {
      ...summary,
      confidence: summary.confidence ? Number(summary.confidence) : null,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await params;
  const role = session.user.role;
  if (!["ADMIN", "SUPER_ADMIN", "TEACHER"].includes(role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  // Teachers can only regenerate their own classes.
  if (role === "TEACHER") {
    const cs = await prisma.classSession.findUnique({
      where: { id },
      select: { class: { select: { teacher: { select: { userId: true } } } } },
    });
    if (!cs || cs.class.teacher.userId !== session.user.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  }
  try {
    const result = await generateLessonSummary(id, {
      generatedById: session.user.id,
    });
    await logAudit({
      action: "LESSON_SUMMARY_GENERATED",
      entity: "ClassSession",
      entityId: id,
      metadata: { confidence: result.confidence },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[POST /api/sessions/[id]/summary]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "FAILED" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await params;
  const role = session.user.role;
  if (!["ADMIN", "SUPER_ADMIN", "TEACHER"].includes(role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (role === "TEACHER") {
    const cs = await prisma.classSession.findUnique({
      where: { id },
      select: { class: { select: { teacher: { select: { userId: true } } } } },
    });
    if (!cs || cs.class.teacher.userId !== session.user.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  }
  const body = (await req.json()) as Partial<{
    homework: string;
    homeworkAr: string;
    teacherActions: string;
    teacherActionsAr: string;
  }>;
  const updated = await prisma.lessonSummary.update({
    where: { sessionId: id },
    data: {
      homework: body.homework,
      homeworkAr: body.homeworkAr,
      teacherActions: body.teacherActions,
      teacherActionsAr: body.teacherActionsAr,
    },
  });
  await logAudit({
    action: "LESSON_SUMMARY_EDITED",
    entity: "ClassSession",
    entityId: id,
  });
  return NextResponse.json({ ok: true, summary: updated });
}
