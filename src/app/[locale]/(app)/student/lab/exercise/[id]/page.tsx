import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isLabVisibleToStudent } from "@/lib/lab/visibility";
import { isBlockContent } from "@/lib/lab/blocks";
import { ExercisePlayer } from "./exercise-player";
import { ExerciseSolver } from "@/components/lab/exercise-solver";

export const dynamic = "force-dynamic";

/**
 * /student/lab/exercise/[id] — opens an exercise the student is allowed to see
 * (published library OR assigned to them). Block-based exercises (Lab Studio v2)
 * render the new solver; legacy exercises keep the old player.
 */
export default async function ExercisePlayerPage({ params }: { params: { id: string; locale: string } }) {
  const session = await requireRole("STUDENT");

  const exercise = await prisma.labExercise.findUnique({ where: { id: params.id } });
  if (!exercise) notFound();

  const student = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!student) redirect(`/${params.locale}/student`);

  const canSee = await isLabVisibleToStudent(exercise.id, student.id);
  if (!canSee) notFound();

  const latestAttempt = await prisma.labAttempt.findFirst({
    where: { exerciseId: params.id, studentId: student.id },
    orderBy: { startedAt: "desc" },
  });

  if (isBlockContent(exercise.content)) {
    return (
      <div className="mx-auto max-w-2xl">
        <ExerciseSolver
          exercise={{
            id: exercise.id,
            title: exercise.title,
            titleAr: exercise.titleAr,
            instructions: (exercise.content as any).instructions ?? null,
            blocks: (exercise.content as any).blocks ?? [],
            pointsValue: exercise.pointsValue,
          }}
          attempt={
            latestAttempt
              ? {
                  id: latestAttempt.id,
                  status: latestAttempt.status,
                  submission: latestAttempt.submission,
                  score: latestAttempt.score != null ? Number(latestAttempt.score) : null,
                  aiEvaluation: latestAttempt.aiEvaluation,
                }
              : null
          }
          backHref="/student/lab"
        />
      </div>
    );
  }

  // Legacy content → original player.
  return (
    <ExercisePlayer
      exercise={{
        id: exercise.id, type: exercise.type, level: exercise.level,
        title: exercise.title, titleAr: exercise.titleAr,
        description: exercise.description, descriptionAr: exercise.descriptionAr,
        content: exercise.content, pointsValue: exercise.pointsValue,
      }}
      latestAttempt={
        latestAttempt
          ? { id: latestAttempt.id, status: latestAttempt.status, submission: latestAttempt.submission, score: latestAttempt.score != null ? Number(latestAttempt.score) : null, aiEvaluation: latestAttempt.aiEvaluation }
          : null
      }
    />
  );
}
