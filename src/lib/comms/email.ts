/**
 * Email sending via Resend.
 *
 * Server-side only — `RESEND_API_KEY` must never reach the client.
 * When the key is absent (local dev), the email is mock-sent: logged to
 * the console and reported as a success so the rest of the pipeline runs.
 */
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const DEFAULT_FROM =
  process.env.RESEND_FROM_EMAIL ?? "Hajr Academy <onboarding@resend.dev>";

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
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

export async function sendEmail(params: SendEmailParams): Promise<SendResult> {
  if (!apiKey) {
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
