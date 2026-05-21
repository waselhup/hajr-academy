/**
 * In-app notification creation.
 *
 * Inserts a `Notification` row. The client subscribes to Supabase Realtime
 * on the `Notification` table (filtered by userId) and surfaces new rows
 * in the bell dropdown + a toast.
 */
import { prisma } from "@/lib/prisma";
import type { Notification, NotificationType, NotificationPriority } from "@prisma/client";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  actionUrl?: string;
  actionLabel?: string;
  actionLabelAr?: string;
  refType?: string;
  refId?: string;
  priority?: NotificationPriority;
  expiresAt?: Date;
}

/** Create a single in-app notification. */
export async function createNotification(
  params: CreateNotificationParams
): Promise<Notification> {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      titleAr: params.titleAr,
      body: params.body,
      bodyAr: params.bodyAr,
      actionUrl: params.actionUrl ?? null,
      actionLabel: params.actionLabel ?? null,
      actionLabelAr: params.actionLabelAr ?? null,
      refType: params.refType ?? null,
      refId: params.refId ?? null,
      priority: params.priority ?? "NORMAL",
      expiresAt: params.expiresAt ?? null,
    },
  });
}

/** Create the same notification for many users (bulk insert). */
export async function createNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
): Promise<number> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return 0;
  const result = await prisma.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      titleAr: params.titleAr,
      body: params.body,
      bodyAr: params.bodyAr,
      actionUrl: params.actionUrl ?? null,
      actionLabel: params.actionLabel ?? null,
      actionLabelAr: params.actionLabelAr ?? null,
      refType: params.refType ?? null,
      refId: params.refId ?? null,
      priority: params.priority ?? "NORMAL",
      expiresAt: params.expiresAt ?? null,
    })),
  });
  return result.count;
}
