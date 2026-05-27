import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { LessonSummaryView, type LessonSummaryData } from "@/components/lesson-summary/summary-view";

export const dynamic = "force-dynamic";

export default async function TeacherSessionSummaryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");

  const cs = await prisma.classSession.findUnique({
    where: { id },
    include: {
      class: {
        select: {
          name: true,
          nameAr: true,
          teacher: { select: { userId: true } },
        },
      },
      lessonSummary: true,
    },
  });

  if (!cs) notFound();
  // Teacher gate: only their own class.
  if (
    session.user.role === "TEACHER" &&
    cs.class.teacher.userId !== session.user.id
  ) {
    notFound();
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
        teacherActions: cs.lessonSummary.teacherActions,
        teacherActionsAr: cs.lessonSummary.teacherActionsAr,
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
      editable={true}
      canRegenerate={true}
    />
  );
}
