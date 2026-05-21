import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AttendanceGridClient } from "./attendance-grid-client";

export const dynamic = "force-dynamic";

export default async function TeacherAttendanceSessionPage({
  params,
}: {
  params: Promise<{ locale: string; sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations();

  let cs: any = null;
  let students: any[] = [];

  try {
    const profile = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile) notFound();

    cs = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          include: {
            enrollments: {
              where: { status: "ACTIVE" },
              include: { student: { include: { user: { select: { name: true, nameAr: true } } } } },
            },
          },
        },
        attendances: true,
      },
    });
    if (!cs || cs.class.teacherId !== profile.id) notFound();

    const attMap = new Map<string, any>(cs.attendances.map((a: any) => [a.studentId, a]));
    students = cs.class.enrollments.map((e: any) => {
      const att = attMap.get(e.studentId);
      return {
        studentId: e.studentId,
        name: e.student.user.nameAr ?? e.student.user.name,
        status: att?.status ?? ("PRESENT" as const),
        autoMarked: !!att?.joinedAt && !att?.markedBy,
      };
    });
  } catch (e) {
    console.error("[teacher-attendance-session] DB query failed:", e);
    notFound();
  }

  return (
    <AttendanceGridClient
      sessionId={cs.id}
      className={cs.class.nameAr ?? cs.class.name}
      scheduledDate={cs.scheduledDate.toISOString()}
      students={students}
    />
  );
}
