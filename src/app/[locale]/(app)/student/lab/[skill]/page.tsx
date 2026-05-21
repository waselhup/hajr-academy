import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { SkillExerciseList } from "./skill-list-client";

export const dynamic = "force-dynamic";

const VALID_SKILLS = [
  "speaking", "listening", "writing", "reading", "grammar", "vocabulary",
];

/**
 * /student/lab/[skill] — exercises for one skill, with level/status filters.
 */
export default async function SkillExercisesPage({
  params,
}: {
  params: { skill: string; locale: string };
}) {
  const session = await requireRole("STUDENT");
  const t = await getTranslations("Lab");

  const skillLower = params.skill.toLowerCase();
  if (!VALID_SKILLS.includes(skillLower)) notFound();
  const skill = skillLower.toUpperCase();

  let exercises: any[] = [];

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const rows = await prisma.labExercise.findMany({
      where: { type: skill as never, isPublished: true },
      orderBy: [{ level: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        type: true,
        level: true,
        title: true,
        titleAr: true,
        description: true,
        descriptionAr: true,
        estimatedMinutes: true,
        pointsValue: true,
      },
    });

    // Attach this student's attempt status per exercise.
    let attemptMap = new Map<string, { status: string; score: number | null }>();
    if (student) {
      const attempts = await prisma.labAttempt.findMany({
        where: {
          studentId: student.id,
          exerciseId: { in: rows.map((r) => r.id) },
        },
        orderBy: { startedAt: "desc" },
        select: { exerciseId: true, status: true, score: true },
      });
      for (const a of attempts) {
        if (!attemptMap.has(a.exerciseId)) {
          attemptMap.set(a.exerciseId, {
            status: a.status,
            score: a.score != null ? Number(a.score) : null,
          });
        }
      }
    }

    exercises = rows.map((r) => ({
      ...r,
      attempt: attemptMap.get(r.id) ?? null,
    }));
  } catch (e) {
    console.error("[student-lab-skill] DB query failed:", e);
  }

  const skillKey = ("skill" +
    skill.charAt(0) +
    skill.slice(1).toLowerCase()) as
    | "skillSpeaking" | "skillListening" | "skillWriting"
    | "skillReading" | "skillGrammar" | "skillVocabulary";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t(skillKey)}</h1>
      <SkillExerciseList exercises={exercises} />
    </div>
  );
}
