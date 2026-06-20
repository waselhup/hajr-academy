"use server";

/**
 * Teacher → student evaluations. The teacher rates 8 criteria on a 4-point
 * rubric (Excellent / Good / Satisfactory / Needs Improvement) and writes three
 * feedback notes (Strengths, Areas for Improvement, Next Action). The legacy
 * participation (1–5) and improvement columns are DERIVED from the rubric so
 * existing admin aggregates keep working. Ownership is enforced server-side: a
 * teacher may only evaluate students enrolled in one of THEIR classes.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

export const EVAL_CRITERIA = [
  "attendance", "participation", "communication", "comprehension",
  "homework", "behavior", "confidence", "overall",
] as const;
const RATING = z.enum(["EXCELLENT", "GOOD", "SATISFACTORY", "NEEDS_IMPROVEMENT"]);

const schema = z.object({
  studentId: z.string().min(1),
  classId: z.string().min(1).optional().nullable(),
  skillLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  criteria: z.record(RATING).optional().default({}),
  strengths: z.string().max(2000).optional().nullable(),
  areasForImprovement: z.string().max(2000).optional().nullable(),
  nextAction: z.string().max(2000).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});

const PART: Record<string, number> = { EXCELLENT: 5, GOOD: 4, SATISFACTORY: 3, NEEDS_IMPROVEMENT: 2 };

export async function createEvaluationAction(
  input: z.infer<typeof schema>
): Promise<Result<{ id: string }>> {
  const session = await requireRole("TEACHER");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!teacher) return { ok: false, error: "NO_TEACHER" };

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: parsed.data.studentId, class: { teacherId: teacher.id } },
    select: { id: true },
  });
  if (!enrollment) return { ok: false, error: "STUDENT_NOT_IN_YOUR_CLASS" };

  let classId: string | null = null;
  if (parsed.data.classId) {
    const klass = await prisma.class.findFirst({
      where: { id: parsed.data.classId, teacherId: teacher.id },
      select: { id: true },
    });
    if (!klass) return { ok: false, error: "CLASS_NOT_YOURS" };
    classId = klass.id;
  }

  // Derive legacy columns from the rubric.
  const c = parsed.data.criteria ?? {};
  const participation = PART[c.participation ?? ""] ?? 3;
  const overall = c.overall;
  const improvement =
    overall === "EXCELLENT" || overall === "GOOD" ? "IMPROVED"
    : overall === "NEEDS_IMPROVEMENT" ? "DECLINED" : "SAME";

  const created = await prisma.studentEvaluation.create({
    data: {
      studentId: parsed.data.studentId,
      teacherId: teacher.id,
      classId,
      skillLevel: parsed.data.skillLevel,
      participation,
      improvement,
      criteria: Object.keys(c).length ? (c as any) : undefined,
      strengths: parsed.data.strengths?.trim() || null,
      areasForImprovement: parsed.data.areasForImprovement?.trim() || null,
      nextAction: parsed.data.nextAction?.trim() || null,
      note: parsed.data.note?.trim() || null,
    },
    select: { id: true },
  });

  await audit.mutation(session.user.id, "STUDENT_EVALUATED", "StudentEvaluation", created.id, {
    studentId: parsed.data.studentId,
    skillLevel: parsed.data.skillLevel,
    criteria: c,
  });

  revalidatePath(`/teacher/students/${parsed.data.studentId}`);
  return { ok: true, id: created.id };
}
