/**
 * Email sending via Resend.
 *
 * Server-side only — `RESEND_API_KEY` must never reach the client.
 *
 * Mock mode is a LOCAL affordance only. On the live site a missing key
 * returns a failure instead of a fake success: silently "sending" password
 * resets, receipts and login credentials that never arrive is far worse
 * than a caller that can see the send failed and fall back.
 */
import { Resend } from "resend";
import { isProductionEnv } from "@/lib/finance/moyasar";

const apiKey = process.env.RESEND_API_KEY;
const DEFAULT_FROM =
  process.env.RESEND_FROM_EMAIL ?? "Hajr Academy <onboarding@resend.dev>";

export interface SendEmailAttachment {
  filename: string;
  /** Base64-encoded content. */
  content: string;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: SendEmailAttachment[];
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mocked?: boolean;
}

/** Strip HTML tags for a plain-text fallback body. */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Retry a send up to 3 times with exponential backoff on failure. */
async function withRetry<T>(
  fn: () => Promise<T>,
  isSuccess: (r: T) => boolean
): Promise<T> {
  let last: T | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    last = await fn();
    if (isSuccess(last)) return last;
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  return last as T;
}

/** True when real email can actually leave this deployment. */
export function emailConfigured(): boolean {
  return !!apiKey;
}

export async function sendEmail(params: SendEmailParams): Promise<SendResult> {
  if (!apiKey) {
    if (isProductionEnv()) {
      console.error("[email] RESEND_API_KEY missing in production — not sent", {
        to: params.to,
        subject: params.subject,
      });
      return { success: false, error: "Email is not configured." };
    }
    console.log("[email mock]", {
      to: params.to,
      subject: params.subject,
      preview: stripHtml(params.html ?? params.text ?? "").slice(0, 120),
    });
    return { success: true, messageId: "mock-" + Date.now(), mocked: true };
  }

  const resend = new Resend(apiKey);

  return withRetry<SendResult>(
    async () => {
      try {
        const result = await resend.emails.send({
          from: params.from ?? DEFAULT_FROM,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text ?? stripHtml(params.html ?? ""),
          replyTo: params.replyTo,
          cc: params.cc,
          bcc: params.bcc,
          attachments: params.attachments?.map((a) => ({
            filename: a.filename,
            content: a.content,
          })) as any,
        });
        if (result.error) {
          return { success: false, error: result.error.message };
        }
        return { success: true, messageId: result.data?.id };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Email send failed",
        };
      }
    },
    (r) => r.success
  );
}
