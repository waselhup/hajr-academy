"use server";

/**
 * Centralized Feedback Bank — admin-only "compose once, send to many" action.
 *
 * Intended for program-end feedback: an admin authors a bilingual message and
 * fans it out to the selected students + parents over the existing notify
 * pipe (in-app + email). No new DB table — this is a send action; delivery is
 * owned by notify()/notifyMany().
 */
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyMany } from "@/lib/notify";

type Result = { ok: true; count: number } | { ok: false; error: string };

export interface SendFeedbackInput {
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  userIds: string[];
}

const MAX_RECIPIENTS = 1000;

/**
 * Validate the admin, sanitize the recipient list against real STUDENT/PARENT
 * accounts, then fan the message out over in-app + email. Returns the number
 * of recipients actually notified.
 */
export async function sendFeedbackAction(input: SendFeedbackInput): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");

  const title = (input.title ?? "").trim();
  const titleAr = (input.titleAr ?? "").trim();
  const body = (input.body ?? "").trim();
  const bodyAr = (input.bodyAr ?? "").trim();

  // Body is the message — at least one language must be present. Mirror it so
  // neither locale receives an empty notification.
  if (!body && !bodyAr) return { ok: false, error: "EMPTY_BODY" };
  const finalBody = body || bodyAr;
  const finalBodyAr = bodyAr || body;
  const finalTitle = title || titleAr || finalBody.slice(0, 80);
  const finalTitleAr = titleAr || title || finalBodyAr.slice(0, 80);

  const requested = [...new Set((input.userIds ?? []).filter(Boolean))].slice(0, MAX_RECIPIENTS);
  if (requested.length === 0) return { ok: false, error: "NO_RECIPIENTS" };

  // Only ever address real, active student/parent accounts — never trust the
  // client-supplied id list blindly (no PII leak, no cross-role sends).
  const recipients = await prisma.user.findMany({
    where: { id: { in: requested }, isActive: true, role: { in: ["STUDENT", "PARENT"] } },
    select: { id: true },
  });
  const ids = recipients.map((r) => r.id);
  if (ids.length === 0) return { ok: false, error: "NO_RECIPIENTS" };

  try {
    await notifyMany(ids, {
      type: "SYSTEM_ANNOUNCEMENT",
      title: finalTitle,
      titleAr: finalTitleAr,
      body: finalBody,
      bodyAr: finalBodyAr,
      channels: ["inApp", "email"],
      priority: "NORMAL",
      refType: "FeedbackBank",
    });
  } catch (e) {
    console.error("[feedback-bank] send failed:", e);
    return { ok: false, error: "SEND_FAILED" };
  }

  await audit.mutation(session.user.id, "FEEDBACK_BANK_SENT", "FeedbackBank", session.user.id, {
    recipients: ids.length,
  });

  return { ok: true, count: ids.length };
}
