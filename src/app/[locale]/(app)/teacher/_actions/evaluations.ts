"use server";

/**
 * Teacher → student evaluations (batch 4C, F3).
 *
 * A teacher records a periodic assessment (CEFR skill level, 1–5 participation,
 * an improvement trend, optional note). A teacher may ONLY evaluate students who
 * are enrolled in one of THEIR classes — enforced here on the server via the
 * canonical enrollment ownership query; admins are not the actor here. Each
 * create is audited.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string };

const schema = z.object({
  studentId: z.string().min(1),
  classId: z.string().min(1).optional().nullable(),
  skillLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  participation: z.coerce.number().int().min(1).max(5),
  improvement: z.enum(["IMPROVED", "SAME", "DECLINED"]),
  note: z.string().max(2000).optional().nullable(),
});

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

  // Ownership guard: the student must be enrolled in one of THIS teacher's
  // classes. Reuses the same chain as the teacher's student roster.
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId: parsed.data.studentId,
      class: { teacherId: teacher.id },
    },
    select: { id: true },
  });
  if (!enrollment) return { ok: false, error: "STUDENT_NOT_IN_YOUR_CLASS" };

  // If a class was named, it must also be one of this teacher's classes.
  let classId: string | null = null;
  if (parsed.data.classId) {
    const klass = await prisma.class.findFirst({
      where: { id: parsed.data.classId, teacherId: teacher.id },
      select: { id: true },
    });
    if (!klass) return { ok: false, error: "CLASS_NOT_YOURS" };
    classId = klass.id;
  }

  const created = await prisma.studentEvaluation.create({
    data: {
      studentId: parsed.data.studentId,
      teacherId: teacher.id,
      classId,
      skillLevel: parsed.data.skillLevel,
      participation: parsed.data.participation,
      improvement: parsed.data.improvement,
      note: parsed.data.note?.trim() || null,
    },
    select: { id: true },
  });

  await audit.mutation(session.user.id, "STUDENT_EVALUATED", "StudentEvaluation", created.id, {
    studentId: parsed.data.studentId,
    skillLevel: parsed.data.skillLevel,
    participation: parsed.data.participation,
    improvement: parsed.data.improvement,
  });

  revalidatePath(`/teacher/students/${parsed.data.studentId}`);
  return { ok: true, id: created.id };
}
