import type { AgentTool, AgentContext } from "@/lib/agent/types";
import { getParentProfileId, getChildAttendanceCalendar } from "@/lib/parent/children";
import { resolveChildForParent } from "@/lib/parent/resolve-child";

/**
 * Parent tool — "كم حصة حضر ابني هذا الشهر؟"
 * / "How many classes did my child attend this month?"
 */
export const getChildAttendance: AgentTool = {
  name: "get_child_attendance",
  description:
    "Get a parent's child's attendance this month — sessions attended, total sessions, and the attendance rate. Requires PARENT authentication.",
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

      const now = new Date();
      const cal = await getChildAttendanceCalendar(
        child.studentId,
        now.getFullYear(),
        now.getMonth() + 1
      );

      return {
        childName: child.name,
        month: `${cal.year}-${String(cal.month).padStart(2, "0")}`,
        sessionsAttended: cal.present,
        totalSessions: cal.total,
        attendanceRatePercent: cal.rate,
      };
    } catch (error) {
      return {
        error: `Failed to get attendance: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
