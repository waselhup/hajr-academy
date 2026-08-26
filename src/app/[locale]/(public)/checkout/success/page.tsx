import Link from "next/link";
import { CheckCircle2, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getProduct } from "@/lib/finance/catalog";
import { whatsappLink, purchaseWhatsappMessage } from "@/lib/whatsapp";
import { WhatsAppRedirect } from "@/components/public/whatsapp-redirect";

export const dynamic = "force-dynamic";

/**
 * /checkout/success — landing-purchase confirmation.
 *
 * The payment claim is read from the order, never assumed: an order that
 * has not settled at the gateway yet says so, so we never tell someone
 * their payment is confirmed when no money has moved.
 *
 * A confirmed payment then hands the buyer to WhatsApp with their order
 * details pre-written. Before this, the page promised "the team will contact
 * you within 24 hours" and the customer waited — several paid and were never
 * reached, because nothing on our side actually opened a conversation. Having
 * the BUYER send the first message inverts that: it opens a WhatsApp thread
 * the academy can reply to freely, and it arrives with the student name,
 * package, school year, preferred time and order reference already in it.
 */
export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ order?: string; invoice?: string }>;
}) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const isAr = locale === "ar";

  // The Moyasar callback appends ?invoice=<id>, which for a purchase order
  // is the order id.
  const orderId = sp.order ?? sp.invoice ?? "";
  let paid = false;
  let waHref: string | null = null;

  if (orderId) {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      select: {
        paymentStatus: true,
        studentName: true,
        productSlug: true,
        gradeLevel: true,
        preferredTime: true,
        amountSar: true,
      },
    });
    paid = order?.paymentStatus === "PAID";

    if (paid && order) {
      // Best-effort: a missing catalogue row must not cost us the hand-off,
      // so the package name simply drops out of the message.
      const product = order.productSlug
        ? await getProduct(order.productSlug).catch(() => null)
        : null;

      waHref = whatsappLink(
        purchaseWhatsappMessage({
          isAr,
          studentName: order.studentName,
          packageName: product ? (isAr ? product.nameAr : product.nameEn) : null,
          gradeLevel: order.gradeLevel,
          preferredTime: order.preferredTime,
          amountSar: Number(order.amountSar).toFixed(2),
          // Short reference: the full uuid is unreadable in a chat, and the
          // first block is already unique enough to find the row.
          reference: orderId.split("-")[0].toUpperCase(),
        })
      );
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
          paid ? "bg-green-100" : "bg-amber-100"
        }`}
      >
        {paid ? (
          <CheckCircle2 className="h-9 w-9 text-green-600" />
        ) : (
          <Clock className="h-9 w-9 text-amber-600" />
        )}
      </div>

      <h1 className="mt-6 text-2xl font-bold text-hajr-navy sm:text-3xl">
        {paid
          ? isAr
            ? "أهلاً بك في أكاديمية هجر! 🎉"
            : "Welcome to HAJR Academy! 🎉"
          : isAr
            ? "تم استلام طلبك"
            : "We received your order"}
      </h1>

      <p className="mt-3 text-hajr-body">
        {paid
          ? isAr
            ? "تم تأكيد الدفع. تبقّت خطوة واحدة: أرسل لنا رسالة واتساب لنكمل تسجيل الطالب."
            : "Your payment is confirmed. One step left — send us a WhatsApp message so we can finish the student's enrolment."
          : isAr
            ? "طلبك محفوظ ولم يكتمل الدفع بعد. سيتواصل معك فريق هجر لإتمامه."
            : "Your order is saved and the payment is not complete yet. The Hajr team will contact you to finish it."}
      </p>

      {paid && waHref ? (
        <>
          <WhatsAppRedirect
            href={waHref}
            isAr={isAr}
            storageKey={`wa-handoff:${orderId}`}
          />

          <div className="mt-8 space-y-4 rounded-2xl border border-hajr-border bg-white p-6 text-start shadow-card">
            <div className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-hajr-deep-navy" />
              <p className="text-sm text-hajr-body">
                {isAr
                  ? "الرسالة مكتوبة لك مسبقاً وتحتوي تفاصيل طلبك — فقط اضغط إرسال."
                  : "The message is already written for you with your order details — just press send."}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-hajr-deep-navy" />
              <p className="text-sm text-hajr-body">
                {isAr
                  ? "ستصلك بيانات الدخول إلى المنصّة على بريدك الإلكتروني، ويحدّد الفريق الفصل المناسب للطالب."
                  : "Your platform login details will arrive by email, and the team will assign the right class."}
              </p>
            </div>
          </div>
        </>
      ) : (
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
                ? "سيتواصل معك فريق هجر لإكمال إعداد حساب الطالب وتحديد الفصل المناسب."
                : "The Hajr team will contact you to finish setting up the student account and assign the right class."}
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        {!paid && orderId && (
          <Button asChild>
            <Link href={`/${locale}/checkout/pay/${orderId}`}>
              {isAr ? "إتمام الدفع الآن" : "Complete payment now"}
            </Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href={`/${locale}`}>
            {isAr ? "العودة للصفحة الرئيسية" : "Back to home"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
