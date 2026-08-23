/**
 * Single source of truth for the academy's WhatsApp number.
 *
 * The academy line is 05 0245 6651, stored here in international format.
 * NEXT_PUBLIC_WHATSAPP_NUMBER overrides it without a code change — set it
 * WITHOUT a leading "+" or spaces (e.g. "966502456651"), though whatever the
 * env var holds is sanitised to digits so "+966 50 245 6651" also works.
 *
 * The value is read at build time (NEXT_PUBLIC_*), so it is safe to use from
 * both server and client components.
 */

// 0502456651 in international format.
const DEFAULT_NUMBER = "966502456651";

export const WHATSAPP_NUMBER: string =
  (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "") ||
  DEFAULT_NUMBER;

/** wa.me deep link — opens the WhatsApp app on mobile, WhatsApp Web on desktop. */
export function whatsappLink(message: string, number: string = WHATSAPP_NUMBER): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * The "I just bought this package" message a customer sends us right after
 * paying. Kept here so the checkout and billing flows stay in sync.
 */
export function purchaseWhatsappMessage(input: {
  isAr: boolean;
  studentName?: string | null;
  packageName?: string | null;
  gradeLabel?: string | null;
  amountSar?: string | number | null;
  reference?: string | null;
}): string {
  const { isAr, studentName, packageName, gradeLabel, amountSar, reference } = input;

  if (isAr) {
    const lines = [
      `السلام عليكم، لقد اشتريت للتو ${packageName ? `«${packageName}»` : "إحدى الباقات"} وأكملت الدفع.`,
    ];
    if (studentName) lines.push(`اسم الطالب: ${studentName}`);
    if (gradeLabel) lines.push(`الصف الدراسي: ${gradeLabel}`);
    if (amountSar) lines.push(`المبلغ: ${amountSar} ر.س`);
    if (reference) lines.push(`رقم الطلب: ${reference}`);
    lines.push("أرجو إكمال إجراءات التسجيل. شكراً لكم.");
    return lines.join("\n");
  }

  const lines = [
    `Hello, I just bought ${packageName ? `the "${packageName}" package` : "a package"} and completed the payment.`,
  ];
  if (studentName) lines.push(`Student name: ${studentName}`);
  if (gradeLabel) lines.push(`Grade: ${gradeLabel}`);
  if (amountSar) lines.push(`Amount: ${amountSar} SAR`);
  if (reference) lines.push(`Order reference: ${reference}`);
  lines.push("Please continue the enrolment steps. Thank you.");
  return lines.join("\n");
}
