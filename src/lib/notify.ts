/**
 * Universal Notify Pipe — the single function every feature calls when a
 * user needs to know something.
 *
 * Channels run in isolated try/catch — one failure never blocks another.
 *   - inApp    → row in Notification (handled by existing Supabase Realtime
 *                postgres_changes subscription on the bell)
 *   - email    → Resend (mock-mode when RESEND_API_KEY absent)
 *   - sms      → Unifonic (mock-mode when UNIFONIC_APP_SID absent)
 *   - realtime → Supabase broadcast on `user-live:{userId}` event="notification"
 *
 * Email body respects user.preferredLang. SMS silently skipped when phone null.
 *
 * Backward-compat shims `notifyUsers` + `parentUserIdsForStudents` are
 * preserved for legacy callers (zoom webhook, class-session start).
 */
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/comms/email";
import { sendSms } from "@/lib/comms/sms";
import { createNotification } from "@/lib/comms/in-app";
import { createSupabaseServiceClient } from "@/lib/supabase";
import type { NotificationType, NotificationPriority } from "@prisma/client";

export type NotifyChannel = "inApp" | "email" | "sms" | "realtime";

export interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  channels: NotifyChannel[];
  actionUrl?: string;
  actionLabel?: string;
  actionLabelAr?: string;
  priority?: NotificationPriority;
  refType?: string;
  refId?: string;
  emailHtml?: string;
  smsText?: string;
  realtimePayload?: Record<string, unknown>;
}

interface ChannelOutcome {
  channel: NotifyChannel;
  ok: boolean;
  error?: string;
}

async function runChannel(
  channel: NotifyChannel,
  user: { id: string; email: string; phone: string | null; preferredLang: "AR" | "EN" },
  p: NotifyParams
): Promise<ChannelOutcome> {
  try {
    if (channel === "inApp") {
      await createNotification({
        userId: user.id,
        type: p.type,
        title: p.title,
        titleAr: p.titleAr,
        body: p.body,
        bodyAr: p.bodyAr,
        actionUrl: p.actionUrl,
        actionLabel: p.actionLabel,
        actionLabelAr: p.actionLabelAr,
        priority: p.priority,
        refType: p.refType,
        refId: p.refId,
      });
      return { channel, ok: true };
    }

    if (channel === "email") {
      const isAr = user.preferredLang === "AR";
      const subject = isAr ? p.titleAr : p.title;
      const bodyText = isAr ? p.bodyAr : p.body;
      const html = p.emailHtml ?? `<p>${escapeHtml(bodyText)}</p>`;
      const res = await sendEmail({ to: user.email, subject, html, text: bodyText });
      return { channel, ok: res.success, error: res.error };
    }

    if (channel === "sms") {
      if (!user.phone) return { channel, ok: true }; // silent skip when no phone
      const isAr = user.preferredLang === "AR";
      const body = (p.smsText ?? (isAr ? p.bodyAr : p.body)).slice(0, 600);
      const res = await sendSms({ to: user.phone, body });
      return { channel, ok: res.success, error: res.error };
    }

    if (channel === "realtime") {
      const supabase = createSupabaseServiceClient();
      const ch = supabase.channel(`user-live:${user.id}`, {
        config: { broadcast: { ack: false } },
      });
      await ch.subscribe();
      await ch.send({
        type: "broadcast",
        event: "notification",
        payload: {
          type: p.type,
          title: p.title,
          titleAr: p.titleAr,
          body: p.body,
          bodyAr: p.bodyAr,
          actionUrl: p.actionUrl ?? null,
          priority: p.priority ?? "NORMAL",
          ...(p.realtimePayload ?? {}),
        },
      });
      await supabase.removeChannel(ch);
      return { channel, ok: true };
    }

    return { channel, ok: false, error: "Unknown channel" };
  } catch (e) {
    return {
      channel,
      ok: false,
      error: e instanceof Error ? e.message : "channel failed",
    };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Send a notification to a single user on the requested channels.
 * Each channel is isolated — partial failure does not block the others.
 */
export async function notify(params: NotifyParams): Promise<void> {
  if (!params.userId || params.channels.length === 0) return;
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, email: true, phone: true, preferredLang: true, isActive: true },
  });
  if (!user || !user.isActive) return;

  const outcomes: ChannelOutcome[] = [];
  for (const ch of params.channels) {
    outcomes.push(await runChannel(ch, user, params));
  }
  const summary = outcomes
    .map((o) => `${o.channel}=${o.ok ? "ok" : `fail(${o.error ?? "?"})`}`)
    .join(" ");
  console.info(`[notify] user=${params.userId} type=${params.type} ${summary}`);
}

/** Same payload, many users. */
export async function notifyMany(
  userIds: string[],
  params: Omit<NotifyParams, "userId">
): Promise<void> {
  const unique = [...new Set(userIds)].filter(Boolean);
  for (const userId of unique) {
    await notify({ ...params, userId });
  }
}

/** Send to every active admin (SUPER_ADMIN + ADMIN). */
export async function notifyAdmins(
  params: Omit<NotifyParams, "userId">
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
    select: { id: true },
  });
  await notifyMany(admins.map((a) => a.id), params);
}

// ─────────────────────────────────────────────────────────────────────
// Legacy shims — kept so existing zoom webhook + class-session start
// keep compiling without churn. New code should use notify*/notifyMany.
// ─────────────────────────────────────────────────────────────────────

/**
 * Legacy in-app-only helper. Pre-Sprint-1 code calls this directly; new
 * code should use notifyMany() with channels:["inApp"].
 */
export async function notifyUsers(
  userIds: string[],
  payload: {
    type: NotificationType;
    title: string;
    titleAr: string;
    body?: string;
    bodyAr?: string;
    message?: string;
    messageAr?: string;
    actionUrl?: string;
    link?: string;
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
