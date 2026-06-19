// Lab Studio v2 — visibility / targeting (mirrors src/lib/assignments/visibility.ts).
//   audience = LIBRARY   → self-discovery: any student may open it when published
//   audience = ALL_CLASS → assigned to every ACTIVE-enrolled student in the class
//   audience = SELECTED   → assigned only to students named in LabExerciseTarget
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// LabExercise has no `class` relation field (only classId, additive). The caller
// passes the student's ACTIVE classIds; we match assigned exercises within them.
export function labAssignedWhereByClassIds(classIds: string[], studentId: string): Prisma.LabExerciseWhereInput {
  return {
    OR: [
      { audience: "ALL_CLASS", classId: { in: classIds } },
      { audience: "SELECTED", classId: { in: classIds }, targets: { some: { studentId } } },
    ],
  };
}

/** May this student open/attempt this exercise? (assigned OR published library). */
export async function isLabVisibleToStudent(exerciseId: string, studentId: string): Promise<boolean> {
  const ex = await prisma.labExercise.findUnique({
    where: { id: exerciseId },
    select: { audience: true, isPublished: true, classId: true },
  });
  if (!ex) return false;
  if (ex.audience === "LIBRARY") return ex.isPublished;
  if (!ex.classId) return false;
  // assigned: student must have an ACTIVE enrollment in the class…
  const enrolled = await prisma.enrollment.findFirst({
    where: { classId: ex.classId, studentId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!enrolled) return false;
  if (ex.audience === "ALL_CLASS") return true;
  // …and (SELECTED) be in the target set.
  const target = await prisma.labExerciseTarget.findFirst({
    where: { exerciseId, studentId },
    select: { id: true },
  });
  return !!target;
}

/** User ids to notify when a lab is assigned (honours audience). */
export async function labTargetedUserIds(input: {
  classId: string;
  audience: "ALL_CLASS" | "SELECTED";
  studentIds?: string[];
}): Promise<string[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { classId: input.classId, status: "ACTIVE" },
    select: { studentId: true, student: { select: { userId: true } } },
  });
  const eligible =
    input.audience === "SELECTED"
      ? enrollments.filter((e) => (input.studentIds ?? []).includes(e.studentId))
      : enrollments;
  return eligible.map((e) => e.student.userId).filter(Boolean);
}
