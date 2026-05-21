import { requireRole } from "@/lib/rbac";
import { ExamRunner } from "./exam-runner";

export const dynamic = "force-dynamic";

/**
 * /student/exams/[examId]/take — the fullscreen exam runner.
 *
 * The page itself is a thin shell: the runner client fetches the exam
 * and questions from /api/exams/[examId]/start (which is the single
 * source of truth for the server-authoritative deadline).
 */
export default async function ExamTakePage({
  params,
}: {
  params: { examId: string; locale: string };
}) {
  await requireRole("STUDENT");

  return <ExamRunner examId={params.examId} locale={params.locale} />;
}
