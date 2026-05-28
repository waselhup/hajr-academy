import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { TestType } from "@prisma/client";
import { ExamHubClient, type ExamGroup, type HubExam } from "./exam-hub-client";

export const dynamic = "force-dynamic";

/**
 * /student/exams — unified exam hub.
 *
 * Tabs: ALL + (STEP if enrolled in STEP_PREP) + IELTS + TOEFL.
 * STEP exams are gated to students with an active STEP_PREP enrollment;
 * other students never see the STEP tab or the exams behind it.
 */
export default async function StudentExamsPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const session = await requireRole("STUDENT");
  const t = await getTranslations("Exam");

  let stepExams: HubExam[] = [];
  let ieltsExams: HubExam[] = [];
  let toeflExams: HubExam[] = [];
  let isInStepClass = false;

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (student) {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: student.id, status: "ACTIVE" },
        select: {
          class: { select: { program: { select: { code: true } } } },
        },
      });
      isInStepClass = enrollments.some(
        (e) => e.class.program.code === "STEP_PREP"
      );
    }

    const rows = await prisma.testExam.findMany({
      where: { isPublished: true },
      orderBy: [{ testType: "asc" }, { type: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        type: true,
        testType: true,
        title: true,
        titleAr: true,
        description: true,
        totalQuestions: true,
        totalMinutes: true,
        passingScore: true,
      },
    });

    let bestScores = new Map<string, number>();
    let inProgress = new Map<string, string>();
    if (student) {
      const attempts = await prisma.examAttempt.findMany({
        where: { studentId: student.id, examId: { in: rows.map((e) => e.id) } },
        select: { examId: true, totalScore: true, status: true, id: true },
      });
      for (const a of attempts) {
        if (a.status === "COMPLETED" && a.totalScore != null) {
          const prev = bestScores.get(a.examId) ?? -1;
          bestScores.set(a.examId, Math.max(prev, Number(a.totalScore)));
        }
        if (a.status === "IN_PROGRESS") inProgress.set(a.examId, a.id);
      }
    }

    const enriched: HubExam[] = rows.map((e) => ({
      ...e,
      bestScore: bestScores.get(e.id) ?? null,
      inProgressAttemptId: inProgress.get(e.id) ?? null,
    }));

    stepExams = enriched.filter((e) => e.testType === "STEP");
    ieltsExams = enriched.filter((e) => e.testType === "IELTS_PRACTICE");
    toeflExams = enriched.filter((e) => e.testType === "TOEFL_PRACTICE");
  } catch (e) {
    console.error("[student-exams] DB query failed:", e);
  }

  // Build visible groups. STEP is dropped entirely (not even sent) when
  // the student is not enrolled in a STEP_PREP class.
  const groups: ExamGroup[] = [];
  const visibleByType: HubExam[] = [];

  if (isInStepClass) {
    groups.push({ type: "STEP", label: t("tabStep"), exams: stepExams });
    visibleByType.push(...stepExams);
  }
  if (ieltsExams.length) {
    groups.push({
      type: "IELTS_PRACTICE",
      label: t("tabIelts"),
      exams: ieltsExams,
    });
    visibleByType.push(...ieltsExams);
  }
  if (toeflExams.length) {
    groups.push({
      type: "TOEFL_PRACTICE",
      label: t("tabToefl"),
      exams: toeflExams,
    });
    visibleByType.push(...toeflExams);
  }
  // ALL is always present (even if empty — the empty-state copy explains).
  groups.unshift({ type: "ALL", label: t("tabAll"), exams: visibleByType });

  // Validate requested tab; default to ALL when the requested tab is
  // hidden (e.g. ?tab=STEP arriving from a redirect on a non-STEP student).
  const requested = (searchParams?.tab ?? "ALL").toUpperCase();
  const defaultTab = groups.some((g) => g.type === requested)
    ? (requested as ExamGroup["type"])
    : "ALL";
  const stepRequestedButLocked =
    requested === "STEP" && !isInStepClass;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <ExamHubClient
        groups={groups}
        defaultTab={defaultTab}
        stepLocked={stepRequestedButLocked}
      />
    </div>
  );
}

// Keep the legacy name reachable via re-export so any in-tree imports
// (none expected, but cheap to guard) keep compiling. Not exported.
export type { HubExam as Exam } from "./exam-hub-client";
