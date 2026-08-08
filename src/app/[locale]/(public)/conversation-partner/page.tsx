import type { Metadata } from "next";
import { ConversationPartnerForm } from "./apply-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  return {
    title: isAr
      ? "كن شريك محادثة — أكاديمية هجر"
      : "Become a conversation partner — HAJR Academy",
    description: isAr
      ? "تحدّث بالإنجليزية مع طلاب أكاديمية هجر وساعدهم على بناء طلاقتهم."
      : "Talk in English with HAJR Academy students and help them build real fluency.",
  };
}

/**
 * /conversation-partner — the public application to converse with students.
 *
 * Deliberately a page, not a mailto or a WhatsApp thread: the academy needs
 * the same details from everyone (country, native language, time zone,
 * availability) to be able to match a partner to a session at all.
 */
export default async function ConversationPartnerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";

  const points = isAr
    ? [
        "جلسات محادثة عبر الإنترنت مع طلاب من المملكة العربية السعودية.",
        "أنت تحدد الأيام والساعات التي تناسبك — نحن نجدول حولها.",
        "لا تحتاج خبرة تدريس؛ نحتاج محادثة طبيعية وصبراً ولطفاً.",
        "الأكاديمية تنسّق الجلسة وتدعو الطلاب وتجهّز رابط اللقاء.",
      ]
    : [
        "Online conversation sessions with students in Saudi Arabia.",
        "You set the days and hours that suit you — we schedule around them.",
        "No teaching experience needed; natural conversation, patience and warmth are.",
        "The academy arranges the session, invites the students and sets up the meeting link.",
      ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-hajr-navy">
          {isAr ? "كن شريك محادثة" : "Become a conversation partner"}
        </h1>
        <p className="mt-2 leading-relaxed text-hajr-muted">
          {isAr
            ? "ساعد طلاب أكاديمية هجر على التحدث بالإنجليزية بثقة — جلسة محادثة واحدة في كل مرة."
            : "Help HAJR Academy students speak English with confidence — one conversation at a time."}
        </p>
        <ul className="mt-5 space-y-2">
          {points.map((p) => (
            <li key={p} className="flex gap-2 text-sm text-hajr-navy">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-hajr-rose" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>

      <ConversationPartnerForm locale={locale} />
    </div>
  );
}
