/**
 * WhatsApp sending via Unifonic.
 *
 * NOTE: WhatsApp Business API access on Unifonic requires account approval.
 * Until that is granted (or if the call fails), this falls back to SMS so
 * the message still reaches the recipient.
 *
 * Server-side only. Mock-sends to the console when keys are absent.
 */
import { normalizeSaudiPhone, sendSms } from "./sms";

const appSid = process.env.UNIFONIC_APP_SID;

export interface SendWhatsappParams {
  to: string;
  body: string;
}

export interface WhatsappResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mocked?: boolean;
  /** True when the message fell back to SMS delivery. */
  fellBackToSms?: boolean;
}

export async function sendWhatsapp(
  params: SendWhatsappParams
): Promise<WhatsappResult> {
  const phone = normalizeSaudiPhone(params.to);
  if (!phone) {
    return { success: false, error: "Invalid Saudi phone number" };
  }

  if (!appSid) {
    console.log("[whatsapp mock]", {
      to: phone,
      body: params.body.slice(0, 100),
    });
    return { success: true, messageId: "mock-" + Date.now(), mocked: true };
  }

  // Attempt WhatsApp delivery via Unifonic.
  try {
    const response = await fetch(
      "https://el.cloud.unifonic.com/rest/WhatsApp/messages",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          AppSid: appSid,
          Recipient: phone,
          Body: params.body,
        }),
      }
    );
    const data = await response.json().catch(() => ({}));
    if (data.success === "true" || data.success === true) {
      return { success: true, messageId: data.data?.MessageID };
    }
    // WhatsApp failed (commonly: not yet approved) — fall back to SMS.
    const sms = await sendSms({ to: phone, body: params.body });
    return {
      success: sms.success,
      messageId: sms.messageId,
      error: sms.success ? undefined : sms.error,
      fellBackToSms: true,
    };
  } catch {
    // Network/transport error — fall back to SMS.
    const sms = await sendSms({ to: phone, body: params.body });
    return {
      success: sms.success,
      messageId: sms.messageId,
      error: sms.success ? undefined : sms.error,
      fellBackToSms: true,
    };
  }
}
