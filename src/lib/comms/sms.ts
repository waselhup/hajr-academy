/**
 * SMS sending via Unifonic (Saudi-native provider).
 *
 * Server-side only. When `UNIFONIC_APP_SID` is absent (local dev), the
 * SMS is mock-sent: logged to the console and reported as success.
 *
 * Unifonic SMS REST API: POST https://el.cloud.unifonic.com/rest/SMS/messages
 * (x-www-form-urlencoded). Saudi numbers are stored/sent as 9665XXXXXXXX.
 */
const appSid = process.env.UNIFONIC_APP_SID;
const DEFAULT_SENDER = process.env.UNIFONIC_SENDER_ID ?? "Hajr";

export interface SendSmsParams {
  to: string;
  body: string;
  senderId?: string;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mocked?: boolean;
}

/**
 * Normalise a Saudi phone number to the `9665XXXXXXXX` form.
 * Accepts 05XXXXXXXX, 5XXXXXXXX, +9665XXXXXXXX, 9665XXXXXXXX.
 * Returns null if the input is not a valid Saudi mobile number.
 */
export function normalizeSaudiPhone(input: string): string | null {
  const cleaned = (input ?? "").replace(/\D/g, "");
  // 05XXXXXXXX (10 digits)
  if (cleaned.startsWith("05") && cleaned.length === 10) {
    return "966" + cleaned.substring(1);
  }
  // 5XXXXXXXX (9 digits)
  if (cleaned.startsWith("5") && cleaned.length === 9) {
    return "966" + cleaned;
  }
  // 9665XXXXXXXX (12 digits) — already normalised
  if (cleaned.startsWith("9665") && cleaned.length === 12) {
    return cleaned;
  }
  // 0096 65XXXXXXXX style → strip leading 00
  if (cleaned.startsWith("009665") && cleaned.length === 14) {
    return cleaned.substring(2);
  }
  return null;
}

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

export async function sendSms(params: SendSmsParams): Promise<SmsResult> {
  const phone = normalizeSaudiPhone(params.to);
  if (!phone) {
    return { success: false, error: "Invalid Saudi phone number" };
  }

  if (!appSid) {
    console.log("[sms mock]", {
      to: phone,
      body: params.body.slice(0, 100),
    });
    return { success: true, messageId: "mock-" + Date.now(), mocked: true };
  }

  return withRetry<SmsResult>(
    async () => {
      try {
        const response = await fetch(
          "https://el.cloud.unifonic.com/rest/SMS/messages",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              AppSid: appSid,
              Recipient: phone,
              Body: params.body,
              SenderID: params.senderId ?? DEFAULT_SENDER,
            }),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (data.success === "true" || data.success === true) {
          return { success: true, messageId: data.data?.MessageID };
        }
        return {
          success: false,
          error: data.errorMessage ?? `Unifonic error (HTTP ${response.status})`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "SMS send failed",
        };
      }
    },
    (r) => r.success
  );
}
