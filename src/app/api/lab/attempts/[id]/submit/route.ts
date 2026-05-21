import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import {
  evaluateWriting,
  evaluateSpeaking,
  gradeListening,
  evaluateMultipleChoice,
} from "@/lib/lab/ai-evaluator";
import { updateSkillLevel, exerciseTypeToSkill } from "@/lib/lab/skill-tracker";

export const dynamic = "force-dynamic";

/**
 * POST /api/lab/attempts/[id]/submit — finalise a lab attempt.
 *
 * Body: { submission, timeSpentSec? }
 *
 * Behaviour by exercise type:
 * - WRITING  → AI writing evaluation, score = overall 0-100
 * - SPEAKING → AI speaking evaluation from transcript
 * - LISTENING/READING/GRAMMAR/VOCABULARY → JS grading of MC answers
 *
 * After scoring, the student's SkillLevel for the matching skill is
 * recalculated, and the attempt is marked COMPLETED.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!student) {
      return NextResponse.json({ error: "No student profile" }, { status: 403 });
    }

    const attempt = await prisma.labAttempt.findUnique({
      where: { id: params.id },
      include: { exercise: true },
    });
    if (!attempt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (attempt.studentId !== student.id) {
      return NextResponse.json({ error: "Not your attempt" }, { status: 403 });
    }
    if (attempt.status === "COMPLETED") {
      return NextResponse.json({ error: "Already submitted" }, { status: 409 });
    }

    const body = await req.json();
    const submission = body.submission ?? attempt.submission ?? {};
    const timeSpentSec =
      typeof body.timeSpentSec === "number"
        ? Math.max(0, Math.round(body.timeSpentSec))
        : attempt.timeSpentSec;

    const exercise = attempt.exercise;
    const content = (exercise.content ?? {}) as Record<string, unknown>;
    const level = exercise.level;

    let score = 0;
    let aiEvaluation: Record<string, unknown> | null = null;

    switch (exercise.type) {
      case "WRITING": {
        const text = String((submission as Record<string, unknown>).text ?? "");
        const evaluation = await evaluateWriting(
          text,
          String(content.prompt ?? exercise.title),
          Array.isArray(content.rubric) ? (content.rubric as string[]) : [],
          level
        );
        score = evaluation.score;
        aiEvaluation = evaluation as unknown as Record<string, unknown>;
        break;
      }
      case "SPEAKING": {
        const sub = submission as Record<string, unknown>;
        const transcript = String(sub.transcript ?? "");
        const evaluation = await evaluateSpeaking(
          transcript,
          String(content.targetText ?? ""),
          level
        );
        score = evaluation.score;
        aiEvaluation = evaluation as unknown as Record<string, unknown>;
        break;
      }
      case "LISTENING":
      case "READING":
      case "GRAMMAR":
      case "VOCABULARY": {
        // Grade MC-style answers. content.questions: [{ id, correct }] or
        // content.items: [{ id, answer }].
        const questions = Array.isArray(content.questions)
          ? (content.questions as Record<string, unknown>[])
          : Array.isArray(content.items)
          ? (content.items as Record<string, unknown>[])
          : [];
        const correctMap: Record<string, string> = {};
        for (const q of questions) {
          const qid = String(q.id ?? "");
          const correct = q.correct ?? q.answer ?? q.correctAnswer;
          if (qid) correctMap[qid] = String(correct ?? "");
        }
        const answers = ((submission as Record<string, unknown>).answers ??
          {}) as Record<string, string>;
        // Answers may be an array of {questionId, selected} — normalise.
        const answerMap: Record<string, string> = Array.isArray(answers)
          ? Object.fromEntries(
              (answers as { questionId: string; selected: string }[]).map((a) => [
                a.questionId,
                a.selected,
              ])
            )
          : answers;
        const result = gradeListening(answerMap, correctMap);
        score = result.score;
        aiEvaluation = {
          breakdown: result,
          autoGraded: true,
        };
        break;
      }
      default: {
        // Fallback: single answer comparison.
        const sub = submission as Record<string, unknown>;
        const correct = evaluateMultipleChoice(sub.answer, content.correctAnswer);
        score = correct ? 100 : 0;
      }
    }

    const pointsEarned = Math.round((score / 100) * exercise.pointsValue);
    const skill = exerciseTypeToSkill(exercise.type);

    const updated = await prisma.labAttempt.update({
      where: { id: params.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        timeSpentSec,
        submission,
        score,
        aiEvaluation: (aiEvaluation ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    // Recalculate the student's skill level for this skill.
    const skillUpdate = await updateSkillLevel(student.id, skill, pointsEarned);

    await logAudit({
      userId: session.user.id,
      action: "LAB_EXERCISE_COMPLETED",
      entity: "LabAttempt",
      entityId: updated.id,
      metadata: {
        exerciseId: exercise.id,
        type: exercise.type,
        score,
        pointsEarned,
        newLevel: skillUpdate.level,
      },
    });

    // Phase 7: notify the student that their feedback is ready.
    try {
      const { triggerLabFeedbackReady } = await import("@/lib/comms/triggers");
      await triggerLabFeedbackReady(
        session.user.id,
        exercise.titleAr ?? exercise.title,
        exercise.id
      );
    } catch (e) {
      console.error("[lab-submit] feedback notification failed:", e);
    }

    return NextResponse.json({
      attempt: updated,
      score,
      pointsEarned,
      skill: {
        skill,
        level: skillUpdate.level,
        confidence: skillUpdate.confidence,
        levelChanged: skillUpdate.changed,
      },
    });
  } catch (e) {
    console.error("[api/lab/attempts/[id]/submit] failed:", e);
    return NextResponse.json({ error: "Failed to submit attempt" }, { status: 500 });
  }
}
