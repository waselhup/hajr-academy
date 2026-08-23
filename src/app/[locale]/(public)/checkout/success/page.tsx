import Link from "next/link";
import { CheckCircle2, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { gradeLabel } from "@/lib/grades";
import { purchaseWhatsappMessage, whatsappLink } from "@/lib/whatsapp";
import { PACKAGE_LABELS } from "@/lib/packages";
import { WhatsAppRedirect } from "@/components/public/whatsapp-redirect";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { locale } = await params;
  const { order: orderId } = await searchParams;
  const isAr = locale === "ar";

  // Pull the order so the WhatsApp message carries the real details. A failed
  // lookup must never block the thank-you page — we fall back to a generic
  // message in that case.
  let order: {
    studentName: string;
    packageType: string;
    gradeLevel: string | null;
    amountSar: string;
  } | null = null;

  if (orderId) {
    try {
      const found = await prisma.purchaseOrder.findUnique({
        where: { id: orderId },
        select: {
          studentName: true,
          packageType: true,
          gradeLevel: true,
          amountSar: true,
        },
      });
      if (found) {
        order = {
          studentName: found.studentName,
          packageType: found.packageType,
          gradeLevel: found.gradeLevel,
          amountSar: found.amountSar.toString(),
        };
      }
    } catch (e) {
      console.error("[checkout-success] order lookup failed:", e);
    }
  }

  const packageName = order
    ? PACKAGE_LABELS[order.packageType]?.[isAr ? "ar" : "en"] ?? order.packageType
    : null;

  const waHref = whatsappLink(
    purchaseWhatsappMessage({
      isAr,
      studentName: order?.studentName,
      packageName,
      gradeLabel: gradeLabel(order?.gradeLevel, isAr),
      amountSar: order?.amountSar,
      reference: orderId ?? null,
    })
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-9 w-9 text-green-600" />
      </div>

      <h1 className="mt-6 text-2xl font-bold text-hajr-navy sm:text-3xl">
        {isAr ? "أهلاً بك في أكاديمية هجر! 🎉" : "Welcome to HAJR Academy! 🎉"}
      </h1>

      <p className="mt-3 text-hajr-body">
        {isAr
          ? "شكراً لك! تم استلام طلبك بنجاح وتأكيد الدفع."
          : "Thank you! Your order has been received and your payment confirmed."}
      </p>

      <div className="mt-8 space-y-4 rounded-2xl border border-hajr-border bg-white p-6 text-start shadow-card">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-hajr-deep-navy" />
          <p className="text-sm text-hajr-body">
            {isAr
              ? "خلال 24 ساعة سَتصلك معلومات الدخول إلى المنصّة عبر الجوال أو البريد الإلكتروني."
              : "Within 24 hours, your platform login details will arrive via phone or email."}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-hajr-deep-navy" />
          <p className="text-sm text-hajr-body">
            {isAr
              ? "سنحوّلك الآن إلى واتساب برسالة جاهزة لإكمال تسجيل الطالب مع فريق هجر."
              : "We are taking you to WhatsApp now with a ready-made message so the Hajr team can finish the student's enrolment."}
          </p>
        </div>
      </div>

      <WhatsAppRedirect
        href={waHref}
        isAr={isAr}
        storageKey={`hajr-wa-redirect:${orderId ?? "no-order"}`}
      />

      <div className="mt-6">
        <Button asChild variant="outline">
          <Link href={`/${locale}`}>
            {isAr ? "العودة للصفحة الرئيسية" : "Back to home"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
