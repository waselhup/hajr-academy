import Link from "next/link";
import { CheckCircle2, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";

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
          ? "تم استلام طلبك بنجاح وتأكيد الدفع."
          : "Your order has been received and your payment confirmed."}
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
              ? "سيتواصل معك فريق هجر لإكمال إعداد حساب الطالب وتحديد الفصل المناسب."
              : "The Hajr team will contact you to finish setting up the student account and assign the right class."}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Button asChild variant="outline">
          <Link href={`/${locale}`}>
            {isAr ? "العودة للصفحة الرئيسية" : "Back to home"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
