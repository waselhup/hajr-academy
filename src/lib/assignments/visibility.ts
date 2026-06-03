/**
 * Assignment visibility — the SINGLE source of truth for "may this student see /
 * submit this assignment?". Opt-in targeting lives here so the student list
 * query, the submit guard, and the notify fan-out can never disagree.
 *
 *   audience = ALL_CLASS → visible to every ACTIVE-enrolled student in the class
 *   audience = SELECTED   → visible only to students named in AssignmentTarget
 *
 * Two shapes are exported because the call sites need different things:
 *   - `assignmentVisibilityWhere(studentId)` → a Prisma `where` fragment, so the
 *     student list query filters in the database (no fetch-then-discard).
 *   - `isAssignmentVisibleToStudent(assignmentId, studentId)` → a single-row
 *     boolean, used by the submit action to reject a non-targeted student.
 *
 * Both deliberately re-check the ACTIVE enrollment too: a SELECTED target whose
 * enrollment later went INACTIVE should stop seeing the assignment, and an
 * ALL_CLASS assignment is only ever for currently-enrolled students.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Prisma `where` fragment matching exactly the assignments a given student is
 * eligible for. Compose with other filters, e.g.
 *   prisma.assignment.findMany({ where: { AND: [scopeFilter, assignmentVisibilityWhere(studentId)] } })
 */
export function assignmentVisibilityWhere(
  studentId: string
): Prisma.AssignmentWhereInput {
  return {
    OR: [
      // Whole-class assignments, gated on a live ACTIVE enrollment in the class.
      {
        audience: "ALL_CLASS",
        class: { enrollments: { some: { studentId, status: "ACTIVE" } } },
      },
      // Targeted assignments: this student must be in the target set AND still
      // have a live ACTIVE enrollment in the class.
      {
        audience: "SELECTED",
        targets: { some: { studentId } },
        class: { enrollments: { some: { studentId, status: "ACTIVE" } } },
      },
    ],
  };
}

/**
 * Single-assignment eligibility check used by the submit action. Returns true
 * only if the assignment is visible to (and therefore submittable by) this
 * student under the rules above. DB-backed so it cannot be spoofed client-side.
 */
export async function isAssignmentVisibleToStudent(
  assignmentId: string,
  studentId: string
): Promise<boolean> {
  const match = await prisma.assignment.findFirst({
    where: {
      AND: [{ id: assignmentId }, assignmentVisibilityWhere(studentId)],
    },
    select: { id: true },
  });
  return !!match;
}

/**
 * Resolve the User ids to notify when an assignment is created, honoring the
 * audience so a SELECTED assignment never leaks to non-targeted students.
 *   ALL_CLASS → every ACTIVE-enrolled student's userId
 *   SELECTED  → only the targeted students' userIds (intersected with ACTIVE
 *               enrollment, so an inactive pick is silently dropped)
 */
export async function targetedStudentUserIds(input: {
  classId: string;
  audience: "ALL_CLASS" | "SELECTED";
  /** StudentProfile ids — required (and meaningful) only when SELECTED. */
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
