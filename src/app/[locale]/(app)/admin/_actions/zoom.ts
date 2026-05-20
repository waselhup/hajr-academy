"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVideoProvider } from "@/lib/video";
import { finalizeSessionAttendance } from "@/lib/attendance";
import { logAudit } from "@/lib/audit";

type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const endSchema = z.object({ sessionId: z.string().min(1) });

/**
 * Force-end a live class meeting (admin only). Ends the Zoom meeting, marks the
 * ClassSession COMPLETED and finalizes attendance.
 */
export async function forceEndSessionAction(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return { ok: false, error: "FORBIDDEN" };
  }
  const parsed = endSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const cs = await prisma.classSession.findUnique({ where: { id: parsed.data.sessionId } });
  if (!cs) return { ok: false, error: "SESSION_NOT_FOUND" };

  try {
    if (cs.zoomMeetingId) {
      await getVideoProvider().endMeeting(cs.zoomMeetingId);
    }
    await prisma.classSession.update({
      where: { id: cs.id },
      data: { status: "COMPLETED", endedAt: new Date() },
    });
    await finalizeSessionAttendance(cs.id);
    await logAudit({
      userId: session.user.id,
      action: "ZOOM_MEETING_FORCE_ENDED",
      entity: "ClassSession",
      entityId: cs.id,
      metadata: { meetingId: cs.zoomMeetingId },
    });
    revalidatePath("/admin/live");
    return { ok: true };
  } catch (e) {
    console.error("[forceEndSessionAction]", e);
    return { ok: false, error: "ZOOM_ERROR" };
  }
}
