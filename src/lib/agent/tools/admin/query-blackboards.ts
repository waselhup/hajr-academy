import type { AgentTool, AgentContext } from "@/lib/agent/types";

export const queryBlackboards: AgentTool = {
  name: "query_blackboards",
  description:
    "Search blackboard rooms by teacher, class, status, or activity. Returns rooms with edit counts and timing.",
  input_schema: {
    type: "object",
    properties: {
      teacherId: {
        type: "string",
        description: "Filter by teacher profile ID",
      },
      classId: {
        type: "string",
        description: "Filter by linked class ID",
      },
      status: {
        type: "string",
        enum: ["active", "archived", "all"],
        description: "Filter by board status (default: all)",
      },
      sortBy: {
        type: "string",
        enum: ["lastEdited", "totalEdits", "created"],
        description: "Sort order (default: lastEdited)",
      },
      limit: {
        type: "number",
        description: "Maximum results (default 10)",
      },
    },
  },

  handler: async (
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<unknown> => {
    try {
      const status = typeof input.status === "string" ? input.status : "all";
      const sortBy = typeof input.sortBy === "string" ? input.sortBy : "lastEdited";
      const limit = typeof input.limit === "number" ? Math.min(input.limit, 50) : 10;
      const teacherId = typeof input.teacherId === "string" ? input.teacherId : undefined;
      const classId = typeof input.classId === "string" ? input.classId : undefined;

      const where: Record<string, unknown> = {};
      if (status === "active") {
        where.isActive = true;
        where.archivedAt = null;
      } else if (status === "archived") {
        where.archivedAt = { not: null };
      }
      if (teacherId) where.teacherId = teacherId;
      if (classId) {
        where.session = { classId };
      }

      const orderBy: Record<string, string> =
        sortBy === "totalEdits"
          ? { totalEdits: "desc" }
          : sortBy === "created"
            ? { createdAt: "desc" }
            : { updatedAt: "desc" };

      const rooms = await context.prisma.blackboardRoom.findMany({
        where,
        include: {
          teacher: { include: { user: { select: { name: true } } } },
          session: { include: { class: { select: { name: true } } } },
        },
        orderBy,
        take: limit,
      });

      return {
        rooms: rooms.map((r) => ({
          id: r.id,
          name: r.name,
          teacherName: r.teacher.user.name,
          className: r.session?.class?.name ?? null,
          isActive: r.isActive,
          archivedAt: r.archivedAt,
          totalEdits: r.totalEdits,
          lastEditedAt: r.lastEditedAt,
          createdAt: r.createdAt,
        })),
        count: rooms.length,
        filters: { status, sortBy, teacherId, classId },
      };
    } catch (error) {
      return { error: "Failed to query blackboards" };
    }
  },
};
