import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { LessonSummaryView, type LessonSummaryData } from "@/components/lesson-summary/summary-view";

export const dynamic = "force-dynamic";

export default async function StudentSessionSummaryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("STUDENT", "PARENT", "ADMIN", "SUPER_ADMIN");

  const cs = await prisma.classSession.findUnique({
    where: { id },
    include: {
      class: {
        select: {
          name: true,
          nameAr: true,
          enrollments: {
            where: { status: "ACTIVE" },
            select: { student: { select: { userId: true } } },
          },
        },
      },
      lessonSummary: true,
    },
  });
  if (!cs) notFound();

  // Access check for students/parents.
  if (session.user.role === "STUDENT") {
    if (!cs.class.enrollments.some((e) => e.student.userId === session.user.id)) {
      notFound();
    }
  } else if (session.user.role === "PARENT") {
    const parent = await prisma.parentProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        childLinks: {
          include: { student: { select: { userId: true } } },
        },
      },
    });
    const childIds = parent?.childLinks.map((l) => l.student.userId) ?? [];
    if (
      !cs.class.enrollments.some((e) =>
        childIds.includes(e.student.userId)
      )
    ) {
      notFound();
    }
  }

  const summary: LessonSummaryData | null = cs.lessonSummary
    ? {
        id: cs.lessonSummary.id,
        sessionId: cs.lessonSummary.sessionId,
        summaryEn: cs.lessonSummary.summaryEn,
        summaryAr: cs.lessonSummary.summaryAr,
        keyVocab: (cs.lessonSummary.keyVocab as any) ?? [],
        grammarPoints: (cs.lessonSummary.grammarPoints as any) ?? [],
        homework: cs.lessonSummary.homework,
        homeworkAr: cs.lessonSummary.homeworkAr,
        teacherActions: null, // hide from student
        teacherActionsAr: null,
        confidence: cs.lessonSummary.confidence
          ? Number(cs.lessonSummary.confidence)
          : null,
        generatedAt: cs.lessonSummary.generatedAt.toISOString(),
      }
    : null;

  return (
    <LessonSummaryView
      sessionId={id}
      className={cs.class.nameAr ?? cs.class.name}
      summary={summary}
      editable={false}
      canRegenerate={false}
    />
  );
}
