import { prisma } from "@/lib/prisma";
import type { NotificationType, Channel } from "@prisma/client";

/**
 * Create in-app notifications. Phase 8 will extend this dispatcher to also send
 * email (Resend) and SMS (Unifonic) based on each user's NotificationPreference.
 * For now everything is written with channel IN_APP.
 */
export async function notifyUsers(
  userIds: string[],
  payload: {
    type: NotificationType;
    title: string;
    titleAr: string;
    message: string;
    messageAr: string;
    link?: string;
    channels?: Channel[];
  }
) {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return;
  await prisma.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      titleAr: payload.titleAr,
      message: payload.message,
      messageAr: payload.messageAr,
      link: payload.link ?? null,
      channels: payload.channels ?? ["IN_APP"],
    })),
  });
}

/** Resolve the User ids for every parent linked to a set of student-profile ids. */
export async function parentUserIdsForStudents(studentProfileIds: string[]): Promise<string[]> {
  if (studentProfileIds.length === 0) return [];
  const links = await prisma.parentStudentLink.findMany({
    where: { studentId: { in: studentProfileIds } },
    include: { parent: { select: { userId: true } } },
  });
  return links.map((l) => l.parent.userId);
}
