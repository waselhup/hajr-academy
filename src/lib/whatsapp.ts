/**
 * The academy's WhatsApp line, and the messages customers send us on it.
 *
 * The number itself already lives in BRAND (966502456651) — this module does
 * not restate it, so there is still exactly one place to change it. What is
 * added here is the env override, which lets the academy point the hand-off
 * at a different line (a WhatsApp Business number, a second agent) without a
 * deploy: set NEXT_PUBLIC_WHATSAPP_NUMBER to anything, in any format, and it
 * is sanitised to digits.
 *
 * NEXT_PUBLIC_* is inlined at build time, so this is usable from both server
 * and client components.
 */

import { BRAND } from "@/lib/brand";
import { gradeLabel, timeLabel } from "@/lib/finance/checkout-options";

export const WHATSAPP_NUMBER: string =
  (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "") ||
  BRAND.contact.whatsapp;

/** wa.me deep link — opens the app on mobile, WhatsApp Web on desktop. */
export function whatsappLink(
  message: string,
  number: string = WHATSAPP_NUMBER
): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * The "I just paid" message a buyer sends us the moment their card clears.
 *
 * It carries everything the person answering needs to act without asking a
 * single follow-up question: who the student is, what was bought, what they
 * paid, which school year, which teaching window, and the order reference
 * that ties the chat to the row in /admin/orders.
 *
 * The customer sends it — not us. A message from the buyer opens a WhatsApp
 * conversation the academy is free to reply to, which an academy-initiated
 * message would not.
 */
export function purchaseWhatsappMessage(input: {
  isAr: boolean;
  studentName?: string | null;
  packageName?: string | null;
  gradeLevel?: string | null;
  preferredTime?: string | null;
  amountSar?: string | number | null;
  reference?: string | null;
}): string {
  const {
    isAr,
    studentName,
    packageName,
    gradeLevel,
    preferredTime,
    amountSar,
    reference,
  } = input;

  const grade = gradeLevel ? gradeLabel(gradeLevel, isAr) : null;
  const time = preferredTime ? timeLabel(preferredTime, isAr) : null;

  if (isAr) {
    const lines = [
      `السلام عليكم، أكملت الدفع للتو${packageName ? ` لـ «${packageName}»` : ""}.`,
    ];
    if (studentName) lines.push(`اسم الطالب: ${studentName}`);
    if (grade && grade !== "—") lines.push(`الصف الدراسي: ${grade}`);
    if (time && time !== "—") lines.push(`الوقت المفضّل: ${time}`);
    if (amountSar) lines.push(`المبلغ المدفوع: ${amountSar} ر.س`);
    if (reference) lines.push(`رقم الطلب: ${reference}`);
    lines.push("أرجو إكمال إجراءات التسجيل. شكراً لكم.");
    return lines.join("\n");
  }

  const lines = [
    `Hello, I have just completed payment${packageName ? ` for "${packageName}"` : ""}.`,
  ];
  if (studentName) lines.push(`Student name: ${studentName}`);
  if (grade && grade !== "—") lines.push(`School year: ${grade}`);
  if (time && time !== "—") lines.push(`Preferred time: ${time}`);
  if (amountSar) lines.push(`Amount paid: ${amountSar} SAR`);
  if (reference) lines.push(`Order reference: ${reference}`);
  lines.push("Please continue the enrolment steps. Thank you.");
  return lines.join("\n");
}

/**
 * The message a conversation-partner applicant sends us right after applying.
 *
 * Partners are recruited abroad, so the application form is often the only
 * contact we have and email to a foreign address is the slowest, least
 * reliable channel we own — several applications sat unanswered because the
 * reply landed in spam. Opening a WhatsApp thread at the moment they apply
 * gives the academy a live channel to screen them on.
 *
 * The reference is the application id, which is what /admin/conversation-
 * partners lists them by.
 */
export function partnerApplicationWhatsappMessage(input: {
  isAr: boolean;
  fullName?: string | null;
  country?: string | null;
  nativeLanguage?: string | null;
  timezone?: string | null;
  reference?: string | null;
}): string {
  const { isAr, fullName, country, nativeLanguage, timezone, reference } = input;

  if (isAr) {
    const lines = ["السلام عليكم، قدّمت للتو طلباً لأكون شريك محادثة في أكاديمية هجر."];
    if (fullName) lines.push(`الاسم: ${fullName}`);
    if (country) lines.push(`الدولة: ${country}`);
    if (nativeLanguage) lines.push(`اللغة الأم: ${nativeLanguage}`);
    if (timezone) lines.push(`المنطقة الزمنية: ${timezone}`);
    if (reference) lines.push(`رقم الطلب: ${reference}`);
    lines.push("أرجو متابعة طلبي. شكراً لكم.");
    return lines.join("\n");
  }

  const lines = [
    "Hello, I have just applied to be a conversation partner with HAJR Academy.",
  ];
  if (fullName) lines.push(`Name: ${fullName}`);
  if (country) lines.push(`Country: ${country}`);
  if (nativeLanguage) lines.push(`Native language: ${nativeLanguage}`);
  if (timezone) lines.push(`Time zone: ${timezone}`);
  if (reference) lines.push(`Application reference: ${reference}`);
  lines.push("I would be glad to hear back about my application. Thank you.");
  return lines.join("\n");
}
