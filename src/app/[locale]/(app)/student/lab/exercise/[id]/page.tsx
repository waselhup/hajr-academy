import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ExercisePlayer } from "./exercise-player";

export const dynamic = "force-dynamic";

/**
 * /student/lab/exercise/[id] — the exercise player. Loads the exercise
 * and the student's latest attempt (for resume / review), then renders
 * the type-specific player client component.
 */
export default async function ExercisePlayerPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const session = await requireRole("STUDENT");

  let exercise: any = null;
  let latestAttempt: any = null;

  try {
    exercise = await prisma.labExercise.findUnique({
      where: { id: params.id },
    });
    if (!exercise || !exercise.isPublished) notFound();

    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!student) redirect(`/${params.locale}/student`);

    latestAttempt = await prisma.labAttempt.findFirst({
      where: { exerciseId: params.id, studentId: student.id },
      orderBy: { startedAt: "desc" },
    });
  } catch (e) {
    console.error("[lab-exercise-player] DB query failed:", e);
    notFound();
  }

  return (
    <ExercisePlayer
      exercise={{
        id: exercise.id,
        type: exercise.type,
        level: exercise.level,
        title: exercise.title,
        titleAr: exercise.titleAr,
        description: exercise.description,
        descriptionAr: exercise.descriptionAr,
        content: exercise.content,
        pointsValue: exercise.pointsValue,
      }}
      latestAttempt={
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
    />
  );
}
