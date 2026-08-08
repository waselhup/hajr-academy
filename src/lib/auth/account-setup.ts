/**
 * Account setup links — how someone whose account we created (a buyer, an
 * accepted teacher, an approved partner) chooses their own first password.
 *
 * Deliberately replaces temporary passwords everywhere. A temp password has
 * to be transported to the person somehow, and every route for that is bad:
 * a shared default is guessable, a generated one has to be copied by hand,
 * and either way it lands in a chat log forever. A single-use link that
 * expires means nothing secret is ever transported at all.
 *
 * Reuses the PasswordResetToken table (purpose = SETUP) so there is one
 * token mechanism to reason about rather than two.
 */

import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailConfigured } from "@/lib/comms/email";

/** Days a setup link stays valid. Longer than a reset — the recipient is
 *  not sitting at the screen waiting for it. */
const SETUP_TTL_DAYS = 7;

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "https://hajracademy.com"
  ).replace(/\/$/, "");
}

export interface SetupLink {
  url: string;
  expiresAt: Date;
}

/**
 * Mint a fresh setup link for a user, invalidating any earlier unused one.
 * The raw token exists only inside the returned URL — the database stores
 * its SHA-256 hash.
 */
export async function issueSetupLink(params: {
  userId: string;
  locale?: string;
}): Promise<SetupLink> {
  const locale = params.locale === "en" ? "en" : "ar";

  await prisma.passwordResetToken.updateMany({
    where: { userId: params.userId, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + SETUP_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: params.userId, tokenHash, expiresAt, purpose: "SETUP" },
  });

  return {
    url: `${appBaseUrl()}/${locale}/reset-password?token=${rawToken}&setup=1`,
    expiresAt,
  };
}

/** A WhatsApp deep link the admin can click to hand the setup link over. */
export function whatsappHandoverLink(params: {
  phone: string;
  name: string;
  setupUrl: string;
  isAr?: boolean;
}): string {
  const digits = params.phone.replace(/\D/g, "");
  const intl = digits.startsWith("966")
    ? digits
    : digits.startsWith("0")
      ? `966${digits.slice(1)}`
      : digits;
  const msg =
    params.isAr === false
      ? `Hello ${params.name}, welcome to HAJR Academy. Set your password and start here: ${params.setupUrl}`
      : `أهلاً ${params.name}، حياك الله في أكاديمية هجر. فعّل حسابك واختر كلمة مرورك من هنا: ${params.setupUrl}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

/** A paid-invoice summary rendered inside the welcome email. */
export interface InvoiceSummary {
  invoiceNumber: string;
  /** What the buyer bought, in the language of the email (Arabic primary). */
  itemAr: string;
  itemEn: string;
  subtotalSar: number;
  discountSar: number;
  vatSar: number;
  totalSar: number;
  issuedAt: Date;
}

function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** dd/mm/yyyy, Western digits — the platform-wide rule. */
function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Riyadh",
  }).format(d);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The receipt block. Inline table styles only — every mail client strips
 * <style> blocks, and a receipt that arrives unstyled reads as a phishing
 * attempt rather than as the academy's invoice.
 */
function invoiceBlockHtml(inv: InvoiceSummary): string {
  const row = (labelAr: string, labelEn: string, value: string, strong = false) => `
    <tr>
      <td style="padding:6px 0;color:#6b7280;font-size:13px">${labelAr} · ${labelEn}</td>
      <td style="padding:6px 0;text-align:left;direction:ltr;font-size:${strong ? "16px" : "14px"};${
        strong ? "font-weight:700;color:#1E2A36" : "color:#2C3E50"
      }">${value}</td>
    </tr>`;

  return `
  <div dir="rtl" style="margin:0 0 24px;border:1px solid #e6e1d8;border-radius:8px;overflow:hidden">
    <div style="background:#FAF6EE;padding:12px 16px;border-bottom:1px solid #e6e1d8">
      <span style="font-weight:700;color:#1E2A36">الفاتورة · Invoice</span>
      <span style="float:left;direction:ltr;color:#6b7280;font-size:13px">${esc(inv.invoiceNumber)}</span>
    </div>
    <div style="padding:16px">
      <p style="margin:0 0 10px;color:#2C3E50">${esc(inv.itemAr)}</p>
      <p style="margin:0 0 12px;color:#6b7280;font-size:13px;direction:ltr;text-align:left">${esc(inv.itemEn)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        ${row("المجموع قبل الضريبة", "Subtotal", `${money(inv.subtotalSar)} SAR`)}
        ${inv.discountSar > 0 ? row("الخصم", "Discount", `−${money(inv.discountSar)} SAR`) : ""}
        ${row("ضريبة القيمة المضافة 15%", "VAT 15%", `${money(inv.vatSar)} SAR`)}
        ${row("الإجمالي المدفوع", "Total paid", `${money(inv.totalSar)} SAR`, true)}
      </table>
      <p style="margin:12px 0 0;color:#27AE60;font-weight:700;font-size:13px">
        مدفوعة بالكامل · Paid in full — ${fmtDate(inv.issuedAt)}
      </p>
      <p style="margin:8px 0 0;color:#8a8378;font-size:12px">
        الفاتورة الضريبية الكاملة مرفقة مع هذه الرسالة ·
        The full tax invoice is attached to this email.
      </p>
    </div>
  </div>`;
}

function setupEmailHtml(params: {
  name: string;
  setupUrl: string;
  headlineAr: string;
  headlineEn: string;
  bodyAr: string;
  bodyEn: string;
  invoice?: InvoiceSummary;
}): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.7;color:#2C3E50;max-width:560px;margin:0 auto">
    <div style="background:#1E2A36;color:#FAF6EE;padding:24px;border-radius:8px 8px 0 0">
      <div style="font-size:20px;font-weight:700">HAJR A° — أكاديمية هجر</div>
    </div>
    <div style="border:1px solid #e6e1d8;border-top:none;padding:24px;border-radius:0 0 8px 8px">
      <p dir="rtl" style="margin:0 0 8px"><strong>${params.headlineAr}</strong></p>
      <p dir="rtl" style="margin:0 0 16px">مرحباً ${esc(params.name)}، ${params.bodyAr}</p>
      ${params.invoice ? invoiceBlockHtml(params.invoice) : ""}
      <p dir="rtl" style="margin:0 0 24px">
        <a href="${params.setupUrl}"
           style="display:inline-block;background:#1E2A36;color:#FAF6EE;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">
          فعّل حسابك واختر كلمة المرور
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #e6e1d8;margin:20px 0"/>
      <p style="margin:0 0 8px"><strong>${params.headlineEn}</strong></p>
      <p style="margin:0 0 16px">Hello ${esc(params.name)}, ${params.bodyEn}</p>
      <p style="margin:0 0 20px"><a href="${params.setupUrl}">${params.setupUrl}</a></p>
      <p style="color:#8a8378;font-size:12px;margin:0">
        هذا الرابط صالح لمدة 7 أيام ويُستخدم مرة واحدة · This link is valid for 7 days and can be used once.
      </p>
    </div>
  </div>`;
}

/**
 * Receipt-only email, for a buyer who already has a working login.
 *
 * They get no setup link — they don't need one — but they still bought
 * something, and a purchase with no receipt is what generates the "did it
 * go through?" message an hour later.
 */
export async function sendPurchaseReceiptEmail(params: {
  email: string;
  name: string;
  invoice: InvoiceSummary;
  attachment?: { filename: string; content: Buffer };
}): Promise<{ emailed: boolean; error?: string }> {
  if (!emailConfigured()) {
    return { emailed: false, error: "Email is not configured on this deployment." };
  }
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.7;color:#2C3E50;max-width:560px;margin:0 auto">
    <div style="background:#1E2A36;color:#FAF6EE;padding:24px;border-radius:8px 8px 0 0">
      <div style="font-size:20px;font-weight:700">HAJR A° — أكاديمية هجر</div>
    </div>
    <div style="border:1px solid #e6e1d8;border-top:none;padding:24px;border-radius:0 0 8px 8px">
      <p dir="rtl" style="margin:0 0 8px"><strong>تم تأكيد عملية الشراء ✅</strong></p>
      <p dir="rtl" style="margin:0 0 16px">
        مرحباً ${esc(params.name)}، وصلتنا دفعتك وفُعّلت باقتك. تجد فاتورتك أدناه.
      </p>
      ${invoiceBlockHtml(params.invoice)}
      <p dir="rtl" style="margin:0 0 20px">
        <a href="${appBaseUrl()}/ar/student"
           style="display:inline-block;background:#1E2A36;color:#FAF6EE;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">
          الدخول إلى حسابك
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #e6e1d8;margin:20px 0"/>
      <p style="margin:0 0 8px"><strong>Your purchase is confirmed ✅</strong></p>
      <p style="margin:0 0 8px">Hello ${esc(params.name)}, your payment was received and your package is active.</p>
      <p style="margin:0"><a href="${appBaseUrl()}/en/student">Open your account</a></p>
    </div>
  </div>`;

  try {
    const res = await sendEmail({
      to: params.email,
      subject: `فاتورتك ${params.invoice.invoiceNumber} — Your invoice · Hajr Academy`,
      html,
      attachments: params.attachment
        ? [
            {
              filename: params.attachment.filename,
              content: params.attachment.content.toString("base64"),
            },
          ]
        : undefined,
    });
    return { emailed: res.success, error: res.error };
  } catch (e) {
    return { emailed: false, error: e instanceof Error ? e.message : "Email send failed" };
  }
}

export interface DeliveryOutcome {
  setupUrl: string;
  /** True when a real email actually left the building. */
  emailed: boolean;
  emailError?: string;
  /** Always present, so a human can hand the link over when email cannot. */
  whatsappUrl?: string;
}

/**
 * Issue a setup link and try to email it. Never throws: the caller's own
 * work (a settled payment, an approved application) must not be undone
 * because a mail server was unreachable — the link is returned either way
 * so an admin can deliver it by hand.
 */
export async function issueAndSendSetupLink(params: {
  userId: string;
  email: string;
  name: string;
  phone?: string | null;
  locale?: string;
  kind: "student" | "teacher" | "partner" | "marketer" | "conversation-partner";
  /** Rendered into the email as a receipt block when the account came from
   *  a paid order. */
  invoice?: InvoiceSummary;
  /** The full tax invoice document, attached to the same email. */
  invoiceAttachment?: { filename: string; content: Buffer };
}): Promise<DeliveryOutcome> {
  const link = await issueSetupLink({
    userId: params.userId,
    locale: params.locale,
  });

  const COPY: Record<
    string,
    { hAr: string; hEn: string; bAr: string; bEn: string }
  > = {
    student: {
      hAr: "تم تفعيل اشتراكك 🎉",
      hEn: "Your subscription is active 🎉",
      bAr: "وصلنا دفعتك وجهّزنا حسابك. اختر كلمة مرورك لتبدأ الدراسة.",
      bEn: "we received your payment and your account is ready. Choose a password to get started.",
    },
    teacher: {
      hAr: "مبارك — انضممت لفريق التدريس 🎓",
      hEn: "Welcome to the teaching team 🎓",
      bAr: "تم قبولك معلّماً في أكاديمية هجر. اختر كلمة مرورك للدخول إلى لوحة المعلّم.",
      bEn: "you have been accepted as a teacher at HAJR Academy. Choose a password to open your dashboard.",
    },
    partner: {
      hAr: "تمت الموافقة على شراكتك 🤝",
      hEn: "Your partnership is approved 🤝",
      bAr: "أصبحت شريك نجاح في أكاديمية هجر. اختر كلمة مرورك لمتابعة طلابك.",
      bEn: "you are now a HAJR success partner. Choose a password to follow your students.",
    },
    "conversation-partner": {
      hAr: "تمت الموافقة عليك كشريك محادثة 🎙️",
      hEn: "You're approved as a conversation partner 🎙️",
      bAr: "أهلاً بك في أكاديمية هجر. اسم الدخول هو بريدك الإلكتروني — اختر كلمة مرورك من الزر أدناه، وستجد في صفحتك جلساتك القادمة وروابط الدخول إليها.",
      bEn: "welcome to HAJR Academy. Your username is this email address — choose your password with the button below, and your page will show the sessions you're invited to with their joining links.",
    },
    marketer: {
      hAr: "تمت الموافقة على طلبك 📣",
      hEn: "Your application is approved 📣",
      bAr: "أصبحت مسوّقاً معتمداً لدى أكاديمية هجر. اختر كلمة مرورك للحصول على رمز الإحالة.",
      bEn: "you are now an approved HAJR marketer. Choose a password to get your referral code.",
    },
  };
  const c = COPY[params.kind] ?? COPY.student;

  const outcome: DeliveryOutcome = { setupUrl: link.url, emailed: false };
  if (params.phone) {
    outcome.whatsappUrl = whatsappHandoverLink({
      phone: params.phone,
      name: params.name,
      setupUrl: link.url,
      isAr: params.locale !== "en",
    });
  }

  if (!emailConfigured()) {
    outcome.emailError = "Email is not configured on this deployment.";
    return outcome;
  }

  try {
    const res = await sendEmail({
      to: params.email,
      subject: `${c.hAr} — ${c.hEn} · Hajr Academy`,
      html: setupEmailHtml({
        name: params.name,
        setupUrl: link.url,
        headlineAr: c.hAr,
        headlineEn: c.hEn,
        bodyAr: c.bAr,
        bodyEn: c.bEn,
        invoice: params.invoice,
      }),
      attachments: params.invoiceAttachment
        ? [
            {
              filename: params.invoiceAttachment.filename,
              content: params.invoiceAttachment.content.toString("base64"),
            },
          ]
        : undefined,
    });
    outcome.emailed = res.success;
    if (!res.success) outcome.emailError = res.error;
  } catch (e) {
    outcome.emailError = e instanceof Error ? e.message : "Email send failed";
  }
  return outcome;
}
