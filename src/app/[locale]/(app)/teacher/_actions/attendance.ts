"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

type ActionResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  sessionId: z.string().min(1),
  entries: z.array(
    z.object({
      studentId: z.string().min(1),
      status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
    })
  ),
});

/**
 * Save manual attendance for a class session. Teacher may only mark their own
 * class; admins may mark any. Overrides whatever the webhook auto-marked.
 */
export async function saveAttendanceAction(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "UNAUTHENTICATED" };
  if (!["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return { ok: false, error: "FORBIDDEN" };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const cs = await prisma.classSession.findUnique({
    where: { id: parsed.data.sessionId },
    include: { class: true },
  });
  if (!cs) return { ok: false, error: "SESSION_NOT_FOUND" };

  if (session.user.role === "TEACHER") {
    const tp = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
    if (!tp || tp.id !== cs.class.teacherId) return { ok: false, error: "NOT_YOUR_CLASS" };
  }

  try {
    for (const entry of parsed.data.entries) {
      await prisma.attendance.upsert({
        where: {
          sessionId_studentId: { sessionId: cs.id, studentId: entry.studentId },
        },
        create: {
          sessionId: cs.id,
          studentId: entry.studentId,
          status: entry.status,
          markedBy: session.user.id,
        },
        update: { status: entry.status, markedBy: session.user.id },
      });
    }
    await logAudit({
      userId: session.user.id,
      action: "ATTENDANCE_MARKED",
      entity: "ClassSession",
      entityId: cs.id,
      metadata: { count: parsed.data.entries.length, manual: true },
    });
    revalidatePath(`/teacher/attendance/${cs.id}`);
    revalidatePath("/teacher/attendance");
    return { ok: true };
  } catch (e) {
    console.error("[saveAttendanceAction]", e);
    return { ok: false, error: "SAVE_FAILED" };
  }
}
