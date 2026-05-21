/**
 * The communication dispatcher — the single entry point for sending.
 *
 * Responsibilities:
 *  1. Resolve recipients (a user, a role, or a class roster).
 *  2. For each recipient, read their NotificationPreference (defaults to all
 *     channels on) and filter the requested channels accordingly.
 *  3. Enforce quiet hours for SMS/WhatsApp (unless the trigger is URGENT or
 *     `bypassQuietHours` is set).
 *  4. Render the bilingual EmailTemplate (if a templateKey is given).
 *  5. For each enabled channel: persist a Message row, call the channel lib,
 *     update the Message status, and write an audit log.
 *  6. For IN_APP, create a Notification row.
 *
 * All sends are tracked; nothing is fire-and-forget.
 */
import { prisma } from "@/lib/prisma";
import type {
  CommChannel,
  NotificationPriority,
  NotificationType,
  Role,
  TriggerType,
} from "@prisma/client";
import { sendEmail } from "./email";
import { sendSms } from "./sms";
import { sendWhatsapp } from "./whatsapp";
import { createNotification } from "./in-app";
import { renderTemplate, wrapEmailShell } from "./templates";
import { logAudit } from "@/lib/audit";

const ALL_CHANNELS: CommChannel[] = ["EMAIL", "SMS", "WHATSAPP", "IN_APP"];

export interface DispatchParams {
  toUserId?: string;
  toRole?: Role;
  toClassId?: string;
  trigger: TriggerType;
  templateKey?: string;
  /** Direct content, used when no templateKey is given. */
  subject?: string;
  bodyEn?: string;
  bodyAr?: string;
  variables?: Record<string, string>;
  channels?: CommChannel[];
  priority?: NotificationPriority;
  bypassQuietHours?: boolean;
  /** NotificationType for the in-app row. Defaults inferred from trigger. */
  notificationType?: NotificationType;
  actionUrl?: string;
}

export interface DispatchResult {
  sent: number;
  failed: number;
  results: { userId: string; channel: CommChannel; status: string }[];
}

interface Recipient {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  locale: "ar" | "en";
}

/** Map a trigger to a sensible default NotificationType for the in-app row. */
function triggerToNotificationType(trigger: TriggerType): NotificationType {
  switch (trigger) {
    case "CLASS_REMINDER":
    case "CLASS_STARTING":
      return "CLASS_STARTING";
    case "PAYMENT_DUE":
      return "PAYMENT_DUE";
    case "PAYMENT_RECEIVED":
      return "PAYMENT_RECEIVED";
    case "ATTENDANCE_MARKED":
      return "ATTENDANCE_UPDATE";
    case "LAB_FEEDBACK":
      return "LAB_FEEDBACK";
    case "EXAM_RESULT":
      return "EXAM_RESULT";
    case "TRIAL_REQUEST":
      return "TRIAL_REQUEST";
    case "ENROLLMENT_CONFIRMED":
    case "TEACHER_ASSIGNED":
      return "ENROLLMENT_UPDATE";
    default:
      return "SYSTEM_ANNOUNCEMENT";
  }
}

/** Which preference category gates a trigger (null = always allowed). */
function triggerCategory(
  trigger: TriggerType
):
  | "classReminders"
  | "paymentAlerts"
  | "attendanceUpdates"
  | "labFeedback"
  | "marketingMessages"
  | null {
  switch (trigger) {
    case "CLASS_REMINDER":
    case "CLASS_STARTING":
      return "classReminders";
    case "PAYMENT_DUE":
    case "PAYMENT_RECEIVED":
      return "paymentAlerts";
    case "ATTENDANCE_MARKED":
      return "attendanceUpdates";
    case "LAB_FEEDBACK":
    case "EXAM_RESULT":
      return "labFeedback";
    default:
      return null;
  }
}

/** Is the current time within the user's quiet-hours window? */
function inQuietHours(start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  // Compare against Riyadh local time (UTC+3).
  const now = new Date();
  const riyadh = new Date(now.getTime() + 3 * 3600_000);
  const mins = riyadh.getUTCHours() * 60 + riyadh.getUTCMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  // Window may wrap past midnight (e.g. 22:00 → 07:00).
  return startMin <= endMin
    ? mins >= startMin && mins < endMin
    : mins >= startMin || mins < endMin;
}

/** Resolve the set of recipients for a dispatch. */
async function resolveRecipients(params: DispatchParams): Promise<Recipient[]> {
  const users: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    preferredLang: "AR" | "EN";
  }[] = [];

  if (params.toUserId) {
    const u = await prisma.user.findUnique({
      where: { id: params.toUserId },
      select: { id: true, name: true, email: true, phone: true, preferredLang: true },
    });
    if (u) users.push(u);
  } else if (params.toRole) {
    const found = await prisma.user.findMany({
      where: { role: params.toRole, isActive: true },
      select: { id: true, name: true, email: true, phone: true, preferredLang: true },
    });
    users.push(...found);
  } else if (params.toClassId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { classId: params.toClassId, status: "ACTIVE" },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                preferredLang: true,
              },
            },
          },
        },
      },
    });
    for (const e of enrollments) users.push(e.student.user);
  }

  return users.map((u) => ({
    userId: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    locale: u.preferredLang === "AR" ? "ar" : "en",
  }));
}

/**
 * Dispatch a communication. Returns a per-channel send summary.
 */
export async function dispatch(params: DispatchParams): Promise<DispatchResult> {
  const result: DispatchResult = { sent: 0, failed: 0, results: [] };

  const recipients = await resolveRecipients(params);
  if (recipients.length === 0) return result;

  // Load the email template once, if a key was given.
  const template = params.templateKey
    ? await prisma.emailTemplate.findUnique({ where: { key: params.templateKey } })
    : null;

  const requestedChannels = params.channels ?? ALL_CHANNELS;
  const priority = params.priority ?? "NORMAL";
  const isUrgent = priority === "URGENT";
  const notifType =
    params.notificationType ?? triggerToNotificationType(params.trigger);
  const category = triggerCategory(params.trigger);
  const vars = params.variables ?? {};

  for (const r of recipients) {
    // Per-recipient preferences (default: all on, marketing off).
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId: r.userId },
    });

    // Category opt-out check.
    if (category && pref && pref[category] === false) {
      continue;
    }

    const threadId = crypto.randomUUID();
    const quiet =
      !isUrgent &&
      !params.bypassQuietHours &&
      pref != null &&
      inQuietHours(pref.quietHoursStart, pref.quietHoursEnd);

    for (const channel of requestedChannels) {
      // Channel-level opt-out.
      if (pref) {
        if (channel === "EMAIL" && !pref.emailEnabled) continue;
        if (channel === "SMS" && !pref.smsEnabled) continue;
        if (channel === "WHATSAPP" && !pref.whatsappEnabled) continue;
        if (channel === "IN_APP" && !pref.inAppEnabled) continue;
      }
      // Profile capability check.
      if (channel === "EMAIL" && !r.email) continue;
      if ((channel === "SMS" || channel === "WHATSAPP") && !r.phone) continue;
      // Quiet hours skip for SMS/WhatsApp.
      if (quiet && (channel === "SMS" || channel === "WHATSAPP")) continue;

      // Render the message body for this recipient's locale.
      const localizedVars = { ...vars, name: r.name };
      let subject = params.subject ?? "";
      let bodyText = (r.locale === "ar" ? params.bodyAr : params.bodyEn) ?? "";
      let bodyHtml = "";

      if (template) {
        subject = renderTemplate(
          r.locale === "ar" ? template.subjectAr : template.subjectEn,
          localizedVars
        );
        const rendered = renderTemplate(
          r.locale === "ar" ? template.bodyAr : template.bodyEn,
          localizedVars
        );
        bodyHtml = wrapEmailShell({ bodyHtml: rendered, locale: r.locale });
        bodyText = rendered;
      } else {
        subject = renderTemplate(subject, localizedVars);
        bodyText = renderTemplate(bodyText, localizedVars);
      }

      // Persist a Message row (status QUEUED).
      const msg = await prisma.message.create({
        data: {
          threadId,
          fromUserId: r.userId, // system messages are self-addressed for tracking
          toUserId: r.userId,
          subject: subject || null,
          body: bodyText,
          bodyHtml: bodyHtml || null,
          channel,
          status: "QUEUED",
          triggerType: params.trigger,
        },
      });

      // Dispatch on the channel.
      let ok = false;
      let externalId: string | undefined;
      let errorMessage: string | undefined;

      if (channel === "EMAIL") {
        const res = await sendEmail({
          to: r.email,
          subject: subject || "Hajr Academy",
          html: bodyHtml || `<p>${bodyText}</p>`,
        });
        ok = res.success;
        externalId = res.messageId;
        errorMessage = res.error;
      } else if (channel === "SMS") {
        const res = await sendSms({ to: r.phone!, body: bodyText.slice(0, 600) });
        ok = res.success;
        externalId = res.messageId;
        errorMessage = res.error;
      } else if (channel === "WHATSAPP") {
        const res = await sendWhatsapp({ to: r.phone!, body: bodyText });
        ok = res.success;
        externalId = res.messageId;
        errorMessage = res.error;
      } else if (channel === "IN_APP") {
        try {
          await createNotification({
            userId: r.userId,
            type: notifType,
            title: subject || "Hajr Academy",
            titleAr: subject || "أكاديمية حجر",
            body: bodyText,
            bodyAr: bodyText,
            actionUrl: params.actionUrl,
            priority,
          });
          ok = true;
        } catch (e) {
          errorMessage = e instanceof Error ? e.message : "in-app failed";
        }
      }

      // Update the Message row with the outcome.
      await prisma.message.update({
        where: { id: msg.id },
        data: {
          status: ok ? "SENT" : "FAILED",
          sentAt: ok ? new Date() : null,
          externalId: externalId ?? null,
          errorMessage: errorMessage ?? null,
        },
      });

      if (ok) result.sent++;
      else result.failed++;
      result.results.push({
        userId: r.userId,
        channel,
        status: ok ? "SENT" : "FAILED",
      });
    }
  }

  // One audit entry summarising the dispatch.
  await logAudit({
    action: "MESSAGE_SENT",
    entity: "Message",
    metadata: {
      trigger: params.trigger,
      templateKey: params.templateKey ?? null,
      recipients: recipients.length,
      sent: result.sent,
      failed: result.failed,
    },
  });

  return result;
}
