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
import { isBlockContent } from "@/lib/lab/blocks";
import { gradeBlocks } from "@/lib/lab/grade-blocks";

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

    let score: number | null = 0;
    let aiEvaluation: Record<string, unknown> | null = null;
    let pendingReview = false;

    // Lab Studio v2 — block-based content: objective blocks auto-grade instantly,
    // writing is AI-graded, speaking is AI-graded when a transcript exists else it
    // goes to teacher review (never a misleading 0%).
    if (isBlockContent(exercise.content)) {
      const sub = (submission as Record<string, any>) ?? {};
      const blocks = exercise.content.blocks;
      const graded = gradeBlocks(blocks, sub);
      const pcts: number[] = [];
      for (const r of graded.perBlock) {
        if (r.points > 0) pcts.push(Math.round((r.earned / r.points) * 100));
      }
      const aiByBlock: Record<string, unknown> = {};
      for (const b of blocks) {
        if (b.kind === "SHORT_TEXT") {
          const text = String(sub[b.id] ?? "");
          if (!text.trim()) { pendingReview = true; continue; }
          try {
            const ev: any = await evaluateWriting(text, (b as any).prompt ?? exercise.title, [], level);
            if (ev && typeof ev.score === "number" && !ev.needsManualReview) { aiByBlock[b.id] = ev; pcts.push(ev.score); }
            else pendingReview = true;
          } catch { pendingReview = true; }
        } else if (b.kind === "RECORD") {
          const rec = sub[b.id];
          const transcript = rec && typeof rec === "object" ? String(rec.transcript ?? "") : "";
          if (!transcript.trim()) { pendingReview = true; continue; } // → teacher review
          try {
            const ev: any = await evaluateSpeaking(transcript, (b as any).targetText ?? "", level);
            if (ev && typeof ev.score === "number" && !ev.needsManualReview) { aiByBlock[b.id] = ev; pcts.push(ev.score); }
            else pendingReview = true;
          } catch { pendingReview = true; }
        }
      }
      score = pcts.length ? Math.round(pcts.reduce((a, c) => a + c, 0) / pcts.length) : null;
      aiEvaluation = { engine: "blocks", ...graded, ai: aiByBlock, pendingReview, blendedScore: score };
    } else
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

    // Pending (awaiting review) → award participation XP so submitting still counts.
    const pointsEarned =
      score == null
        ? Math.round(exercise.pointsValue * 0.3)
        : Math.round((score / 100) * exercise.pointsValue);
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

    // Sprint 7B: award XP for the completed lab attempt (best-effort)
    try {
      const { awardXp } = await import("@/lib/gamification/xp");
      await awardXp({
        studentId: student.id,
        reason: "lab_exercise_passed",
        points: Math.max(0, Math.round(pointsEarned)),
      });
    } catch {}

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
