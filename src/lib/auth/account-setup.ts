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

function setupEmailHtml(params: {
  name: string;
  setupUrl: string;
  headlineAr: string;
  headlineEn: string;
  bodyAr: string;
  bodyEn: string;
}): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.7;color:#2C3E50;max-width:560px;margin:0 auto">
    <div style="background:#1E2A36;color:#FAF6EE;padding:24px;border-radius:8px 8px 0 0">
      <div style="font-size:20px;font-weight:700">HAJR A° — أكاديمية هجر</div>
    </div>
    <div style="border:1px solid #e6e1d8;border-top:none;padding:24px;border-radius:0 0 8px 8px">
      <p dir="rtl" style="margin:0 0 8px"><strong>${params.headlineAr}</strong></p>
      <p dir="rtl" style="margin:0 0 16px">مرحباً ${params.name}، ${params.bodyAr}</p>
      <p dir="rtl" style="margin:0 0 24px">
        <a href="${params.setupUrl}"
           style="display:inline-block;background:#1E2A36;color:#FAF6EE;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">
          فعّل حسابك واختر كلمة المرور
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #e6e1d8;margin:20px 0"/>
      <p style="margin:0 0 8px"><strong>${params.headlineEn}</strong></p>
      <p style="margin:0 0 16px">Hello ${params.name}, ${params.bodyEn}</p>
      <p style="margin:0 0 20px"><a href="${params.setupUrl}">${params.setupUrl}</a></p>
      <p style="color:#8a8378;font-size:12px;margin:0">
        هذا الرابط صالح لمدة 7 أيام ويُستخدم مرة واحدة · This link is valid for 7 days and can be used once.
      </p>
    </div>
  </div>`;
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
  kind: "student" | "teacher" | "partner" | "marketer";
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
      }),
    });
    outcome.emailed = res.success;
    if (!res.success) outcome.emailError = res.error;
  } catch (e) {
    outcome.emailError = e instanceof Error ? e.message : "Email send failed";
  }
  return outcome;
}
