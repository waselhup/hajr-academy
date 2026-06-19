"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { labContentSchema, objectivePoints, isSubjective, type Block } from "@/lib/lab/blocks";
import { labTargetedUserIds } from "@/lib/lab/visibility";
import { notifyMany } from "@/lib/notify";

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

const saveSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["SPEAKING", "LISTENING", "WRITING", "READING", "GRAMMAR", "VOCABULARY"]),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  title: z.string().min(2),
  titleAr: z.string().min(1),
  instructions: z.string().optional().nullable(),
  blocks: z.array(z.any()).min(1),
  estimatedMinutes: z.coerce.number().int().min(1).max(180).optional(),
  audience: z.enum(["LIBRARY", "ALL_CLASS", "SELECTED"]).default("LIBRARY"),
  classId: z.string().optional().nullable(),
  studentIds: z.array(z.string()).optional(),
  dueDate: z.string().optional().nullable(),
});

/** Reward XP scales with the work in the exercise. */
function pointsFor(blocks: Block[]): number {
  const obj = objectivePoints(blocks);
  const subj = blocks.filter((b) => isSubjective(b.kind)).length;
  return Math.min(60, Math.max(10, obj * 2 + subj * 6));
}

export async function saveLabExerciseAction(input: z.infer<typeof saveSchema>): Promise<Result<{ id: string }>> {
  const session = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION: " + parsed.error.issues.map((i) => i.message).join(", ") };
  const d = parsed.data;
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

  // Validate the block content.
  const content = labContentSchema.safeParse({
    version: 2,
    instructions: d.instructions ?? undefined,
    blocks: d.blocks,
  });
  if (!content.success) return { ok: false, error: "BLOCKS_INVALID: " + content.error.issues.map((i) => i.message).slice(0, 3).join("; ") };
  const blocks = content.data.blocks;

  // Resolve targeting / class ownership.
  let classId: string | null = null;
  let studentIds: string[] = [];
  if (d.audience !== "LIBRARY") {
    if (!d.classId) return { ok: false, error: "CLASS_REQUIRED" };
    const klass = await prisma.class.findUnique({ where: { id: d.classId }, select: { id: true, teacherId: true } });
    if (!klass) return { ok: false, error: "CLASS_NOT_FOUND" };
    if (!isAdmin) {
      const tp = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
      if (!tp || tp.id !== klass.teacherId) return { ok: false, error: "NOT_YOUR_CLASS" };
    }
    classId = klass.id;
    if (d.audience === "SELECTED") {
      const roster = await prisma.enrollment.findMany({
        where: { classId, status: "ACTIVE" },
        select: { studentId: true },
      });
      const valid = new Set(roster.map((r) => r.studentId));
      studentIds = (d.studentIds ?? []).filter((s) => valid.has(s));
      if (studentIds.length === 0) return { ok: false, error: "SELECT_STUDENTS" };
    }
  }

  const data = {
    type: d.type,
    level: d.level,
    title: d.title.trim(),
    titleAr: d.titleAr.trim(),
    content: content.data as any,
    estimatedMinutes: d.estimatedMinutes ?? 10,
    pointsValue: pointsFor(blocks),
    audience: d.audience,
    classId,
    dueDate: d.dueDate ? new Date(d.dueDate) : null,
    // LIBRARY exercises are published so they appear in the library; assigned
    // exercises are visible to their targets regardless of this flag.
    isPublished: true,
  };

  try {
    let exerciseId: string;
    if (d.id) {
      // Update — ownership: creator or admin.
      const existing = await prisma.labExercise.findUnique({ where: { id: d.id }, select: { createdBy: true } });
      if (!existing) return { ok: false, error: "NOT_FOUND" };
      if (!isAdmin && existing.createdBy && existing.createdBy !== session.user.id) return { ok: false, error: "NOT_YOURS" };
      await prisma.labExercise.update({ where: { id: d.id }, data });
      await prisma.labExerciseTarget.deleteMany({ where: { exerciseId: d.id } });
      exerciseId = d.id;
    } else {
      const created = await prisma.labExercise.create({
        data: { ...data, createdBy: session.user.id, assignedById: d.audience !== "LIBRARY" ? session.user.id : null },
      });
      exerciseId = created.id;
    }

    if (d.audience === "SELECTED" && studentIds.length) {
      await prisma.labExerciseTarget.createMany({
        data: studentIds.map((studentId) => ({ exerciseId, studentId })),
        skipDuplicates: true,
      });
    }

    await logAudit({
      userId: session.user.id,
      action: d.id ? "LAB_EXERCISE_UPDATED" : "LAB_EXERCISE_CREATED",
      entity: "LabExercise",
      entityId: exerciseId,
      metadata: { type: d.type, audience: d.audience, blocks: blocks.length },
    });

    // Notify assigned students (best-effort).
    if (d.audience !== "LIBRARY" && classId && !d.id) {
      try {
        const userIds = await labTargetedUserIds({ classId, audience: d.audience, studentIds });
        if (userIds.length) {
          await notifyMany(userIds, {
            type: "SYSTEM_ANNOUNCEMENT",
            title: `New lab exercise: ${d.title}`,
            titleAr: `تمرين جديد في المعمل: ${d.titleAr}`,
            body: "A new English Lab exercise was assigned to you.",
            bodyAr: "تم إسناد تمرين جديد لك في معمل اللغة الإنجليزية.",
            channels: ["inApp", "realtime"],
            actionUrl: "/student/lab",
            refType: "LabExercise",
            refId: exerciseId,
          });
        }
      } catch (e) {
        console.error("[saveLabExerciseAction] notify failed:", e);
      }
    }

    revalidatePath("/teacher/lab");
    revalidatePath("/admin/lab");
    revalidatePath("/student/lab");
    return { ok: true, data: { id: exerciseId } };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "DB_ERROR" };
  }
}

export async function deleteLabExerciseAction(id: string): Promise<Result> {
  const session = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  const existing = await prisma.labExercise.findUnique({ where: { id }, select: { createdBy: true } });
  if (!existing) return { ok: false, error: "NOT_FOUND" };
  if (!isAdmin && existing.createdBy && existing.createdBy !== session.user.id) return { ok: false, error: "NOT_YOURS" };
  await prisma.labExercise.delete({ where: { id } });
  await logAudit({ userId: session.user.id, action: "LAB_EXERCISE_DELETED", entity: "LabExercise", entityId: id });
  revalidatePath("/teacher/lab");
  revalidatePath("/admin/lab");
  return { ok: true, data: null };
}
