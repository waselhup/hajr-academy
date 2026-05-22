import type { AgentTool, AgentContext } from "@/lib/agent/types";
import { getParentProfileId } from "@/lib/parent/children";
import { resolveChildForParent } from "@/lib/parent/resolve-child";
import { prisma } from "@/lib/prisma";

/**
 * Parent tool — "متى حصة ابني الجاية؟"
 * / "When is my child's next class?"
 */
export const getChildNextClass: AgentTool = {
  name: "get_child_next_class",
  description:
    "Get a parent's child's next scheduled class — date/time, class name, teacher, and program. Requires PARENT authentication.",
  input_schema: {
    type: "object",
    properties: {
      childName: {
        type: "string",
        description:
          "The child's name. Optional if the parent has only one child.",
      },
    },
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      if (!context.userId || context.userRole !== "PARENT") {
        return {
          error:
            "This feature is for parents only. / هذه الميزة لأولياء الأمور فقط.",
        };
      }

      const parentId = await getParentProfileId(context.userId);
      if (!parentId) {
        return { error: "Parent profile not found. / لم يتم العثور على الملف." };
      }

      const child = await resolveChildForParent(
        parentId,
        typeof input.childName === "string" ? input.childName : undefined
      );
      if ("error" in child) return child;

      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: child.studentId, status: "ACTIVE" },
        select: { classId: true },
      });
      if (enrollments.length === 0) {
        return {
          childName: child.name,
          nextClass: null,
          message: `${child.name} is not enrolled in any class.`,
        };
      }

      const next = await prisma.classSession.findFirst({
        where: {
          classId: { in: enrollments.map((e) => e.classId) },
          status: { in: ["SCHEDULED", "LIVE"] },
          scheduledDate: { gte: new Date(Date.now() - 3600_000) },
        },
        orderBy: { scheduledDate: "asc" },
        include: {
          class: {
            include: {
              teacher: {
                include: { user: { select: { name: true } } },
              },
              program: { select: { nameEn: true, nameAr: true } },
            },
          },
        },
      });

      if (!next) {
        return {
          childName: child.name,
          nextClass: null,
          message: `No upcoming class scheduled for ${child.name}.`,
        };
      }

      return {
        childName: child.name,
        nextClass: {
          className: next.class.nameAr ?? next.class.name,
          teacher: next.class.teacher.user.name,
          program: next.class.program.nameEn,
          scheduledAt: next.scheduledDate.toISOString(),
          status: next.status,
          isLive: next.status === "LIVE",
        },
      };
    } catch (error) {
      return {
        error: `Failed to get next class: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
