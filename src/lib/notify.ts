import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

/**
 * Create in-app notifications for a set of users.
 *
 * Phase 7 introduced `lib/comms/dispatcher.ts` as the canonical multi-channel
 * path (email + SMS + WhatsApp + in-app, preference-aware). This helper
 * remains as a thin in-app-only shim for callers that only need a quick
 * notification without channel routing.
 */
export async function notifyUsers(
  userIds: string[],
  payload: {
    type: NotificationType;
    title: string;
    titleAr: string;
    /** Body text (English). Accepts the legacy `message` name too. */
    body?: string;
    bodyAr?: string;
    message?: string;
    messageAr?: string;
    /** Where clicking the notification navigates. Legacy name: `link`. */
    actionUrl?: string;
    link?: string;
    /** Optional entity reference (e.g. "ClassSession" + sessionId) — used
     * by webhook dedupe queries and by per-entity badge filtering. */
    refType?: string;
    refId?: string;
  }
) {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return;

  const body = payload.body ?? payload.message ?? "";
  const bodyAr = payload.bodyAr ?? payload.messageAr ?? body;
  const actionUrl = payload.actionUrl ?? payload.link ?? null;

  await prisma.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      titleAr: payload.titleAr,
      body,
      bodyAr,
      actionUrl,
      refType: payload.refType ?? null,
      refId: payload.refId ?? null,
    })),
  });
}

/** Resolve the User ids for every parent linked to a set of student-profile ids. */
export async function parentUserIdsForStudents(
  studentProfileIds: string[]
): Promise<string[]> {
  if (studentProfileIds.length === 0) return [];
  const links = await prisma.parentStudentLink.findMany({
    where: { studentId: { in: studentProfileIds } },
    include: { parent: { select: { userId: true } } },
  });
  return links.map((l) => l.parent.userId);
}
