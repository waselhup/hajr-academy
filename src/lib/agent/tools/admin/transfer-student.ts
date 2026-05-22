import type { AgentTool, AgentContext } from "@/lib/agent/types";
import { triggerStudentTransferred } from "@/lib/comms/triggers";
import { logAudit } from "@/lib/audit";

/**
 * Admin tool — "انقل أحمد من فصل A لفصل B"
 * / "Move Ahmed from class A to class B".
 *
 * Two-step: call with confirm=false to preview, then confirm=true to
 * execute the transfer (deactivate old enrollment, create new one,
 * notify everyone).
 */
export const transferStudent: AgentTool = {
  name: "transfer_student",
  description:
    "Transfer a student from their current class to another class. ALWAYS call first with confirm=false to preview; only call with confirm=true after the admin approves. The student, parents, and receiving teacher are notified.",
  input_schema: {
    type: "object",
    properties: {
      studentName: {
        type: "string",
        description: "The student's name (used to find their profile).",
      },
      toClassName: {
        type: "string",
        description: "The name (or cohort code) of the destination class.",
      },
      reason: {
        type: "string",
        description: "Optional reason for the transfer.",
      },
      confirm: {
        type: "boolean",
        description:
          "false (default) = preview; true = execute. Only true after explicit admin approval.",
      },
    },
    required: ["studentName", "toClassName"],
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      if (context.userRole !== "ADMIN" && context.userRole !== "SUPER_ADMIN") {
        return { error: "Admins only." };
      }

      const studentName =
        typeof input.studentName === "string" ? input.studentName.trim() : "";
      const toClassName =
        typeof input.toClassName === "string" ? input.toClassName.trim() : "";
      const reason = typeof input.reason === "string" ? input.reason : null;
      const confirm = input.confirm === true;

      if (!studentName || !toClassName) {
        return { error: "studentName and toClassName are required." };
      }

      // Resolve the student by name.
      const students = await context.prisma.studentProfile.findMany({
        where: {
          user: {
            OR: [
              { name: { contains: studentName, mode: "insensitive" } },
              { nameAr: { contains: studentName, mode: "insensitive" } },
            ],
          },
        },
        include: {
          user: { select: { name: true } },
          enrollments: {
            where: { status: "ACTIVE" },
            include: { class: { select: { id: true, name: true, nameAr: true } } },
          },
        },
        take: 5,
      });
      if (students.length === 0) {
        return { error: `No student found matching "${studentName}".` };
      }
      if (students.length > 1) {
        return {
          error: `Multiple students match "${studentName}". Be more specific.`,
          matches: students.map((s) => s.user.name),
        };
      }
      const student = students[0];

      // Resolve the destination class.
      const classes = await context.prisma.class.findMany({
        where: {
          OR: [
            { name: { contains: toClassName, mode: "insensitive" } },
            { nameAr: { contains: toClassName, mode: "insensitive" } },
            { cohortCode: { contains: toClassName, mode: "insensitive" } },
          ],
        },
        include: {
          teacher: { select: { userId: true } },
          _count: {
            select: { enrollments: { where: { status: "ACTIVE" } } },
          },
        },
        take: 5,
      });
      if (classes.length === 0) {
        return { error: `No class found matching "${toClassName}".` };
      }
      if (classes.length > 1) {
        return {
          error: `Multiple classes match "${toClassName}". Be more specific.`,
          matches: classes.map((c) => c.name),
        };
      }
      const toClass = classes[0];

      const currentClass = student.enrollments[0]?.class ?? null;
      if (currentClass?.id === toClass.id) {
        return { error: "The student is already in that class." };
      }
      if (toClass._count.enrollments >= toClass.maxStudents) {
        return { error: `"${toClass.name}" is full.` };
      }

      // Preview step.
      if (!confirm) {
        return {
          preview: true,
          requiresConfirmation: true,
          message: `This will move ${student.user.name} from ${
            currentClass ? currentClass.name : "(no class)"
          } to ${toClass.name}. Confirm to proceed.`,
          studentName: student.user.name,
          fromClass: currentClass?.name ?? null,
          toClass: toClass.name,
        };
      }

      // Execute: deactivate old enrollment(s), create the new one.
      await context.prisma.enrollment.updateMany({
        where: { studentId: student.id, status: "ACTIVE" },
        data: { status: "DROPPED" },
      });
      const existing = await context.prisma.enrollment.findUnique({
        where: {
          studentId_classId: {
            studentId: student.id,
            classId: toClass.id,
          },
        },
      });
      if (existing) {
        await context.prisma.enrollment.update({
          where: { id: existing.id },
          data: { status: "ACTIVE" },
        });
      } else {
        await context.prisma.enrollment.create({
          data: {
            studentId: student.id,
            classId: toClass.id,
            status: "ACTIVE",
          },
        });
      }

      await logAudit({
        userId: context.userId ?? null,
        action: "STUDENT_TRANSFERRED",
        entity: "StudentProfile",
        entityId: student.id,
        metadata: {
          fromClassId: currentClass?.id ?? null,
          toClassId: toClass.id,
          reason,
          via: "agent",
        },
      });

      try {
        await triggerStudentTransferred({
          studentProfileId: student.id,
          newClassName: toClass.nameAr ?? toClass.name,
          newTeacherUserId: toClass.teacher.userId,
        });
      } catch {
        /* notification failure must not fail the transfer */
      }

      return {
        ok: true,
        message: `${student.user.name} has been transferred to ${toClass.name}.`,
        studentName: student.user.name,
        toClass: toClass.name,
      };
    } catch (error) {
      return {
        error: `Transfer failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
