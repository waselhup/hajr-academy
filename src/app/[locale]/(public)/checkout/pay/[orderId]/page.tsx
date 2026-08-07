import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { gatewayMode } from "@/lib/finance/moyasar";
import { getProduct } from "@/lib/finance/catalog";
import { OrderPayClient } from "./order-pay-client";

export const dynamic = "force-dynamic";

const PACKAGE_LABEL: Record<string, { en: string; ar: string }> = {
  ESSENTIAL: { en: "Essential", ar: "الباقة الأساسية" },
  INTEGRATED: { en: "Integrated", ar: "الباقة المتكاملة" },
  PRIVATE: { en: "Private", ar: "الدروس الخاصة" },
  STEP_PREP_PKG: { en: "STEP preparation", ar: "تحضير STEP" },
  IELTS_PREP_PKG: { en: "IELTS preparation", ar: "تحضير IELTS" },
  SCHOOL: { en: "School partnership", ar: "شراكة مدرسية" },
};

/**
 * /checkout/pay/[orderId] — pay a landing-page purchase with Moyasar.
 *
 * Public by design: the order id is the only credential, exactly as with
 * any emailed payment link, and the page exposes nothing beyond what the
 * buyer just typed. The amount charged comes from the server-side order,
 * never from the URL, and is re-verified against the order again when the
 * gateway reports the payment.
 */
export default async function CheckoutPayPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  const isAr = locale === "ar";

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      studentName: true,
      packageType: true,
      productSlug: true,
      listPriceSar: true,
      discountSar: true,
      promoCode: true,
      amountSar: true,
      paymentStatus: true,
    },
  });

  if (!order) redirect(`/${locale}/checkout`);
  if (order.paymentStatus === "PAID") {
    redirect(`/${locale}/checkout/success?order=${order.id}`);
  }

  // Prefer the catalogue product's own name; fall back to the legacy
  // package label for orders placed before the catalogue existed.
  const product = order.productSlug ? await getProduct(order.productSlug) : null;
  const fallback = PACKAGE_LABEL[order.packageType] ?? {
    en: order.packageType,
    ar: order.packageType,
  };
  const productName = product
    ? isAr
      ? product.nameAr
      : product.nameEn
    : isAr
      ? fallback.ar
      : fallback.en;

  const discount = Number(order.discountSar ?? 0);
  const listPrice =
    order.listPriceSar != null ? Number(order.listPriceSar) : null;
  const money = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA-u-nu-latn" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold text-hajr-navy">
        {isAr ? "إتمام الدفع" : "Complete your payment"}
      </h1>
      <p className="mt-2 text-sm text-hajr-body">
        {isAr
          ? "الدفع يتم عبر بوابة ميسر المرخّصة. بياناتك البنكية لا تمر عبر خوادمنا."
          : "Payment is handled by the licensed Moyasar gateway. Your card details never touch our servers."}
      </p>

      <div className="mt-6 space-y-3 rounded-2xl border border-hajr-border bg-white p-6 shadow-card">
        <div className="flex justify-between text-sm">
          <span className="text-hajr-body">{isAr ? "الطالب" : "Student"}</span>
          <span className="font-medium">{order.studentName}</span>
        </div>
        <div className="flex justify-between gap-3 text-sm">
          <span className="shrink-0 text-hajr-body">
            {isAr ? "الباقة" : "Package"}
          </span>
          <span className="text-end font-medium">{productName}</span>
        </div>
        {discount > 0 && listPrice != null && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-hajr-body">
                {isAr ? "السعر قبل الخصم" : "Price"}
              </span>
              <span className="num">{money(listPrice)}</span>
            </div>
            <div className="flex justify-between text-sm text-green-700">
              <span>
                {isAr ? "الخصم" : "Discount"}
                {order.promoCode ? ` (${order.promoCode})` : ""}
              </span>
              <span className="num">−{money(discount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between border-t border-hajr-border pt-3 text-lg font-bold">
          <span>{isAr ? "الإجمالي" : "Total"}</span>
          <span className="num">
            {money(Number(order.amountSar))} {isAr ? "ر.س" : "SAR"}
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-hajr-border bg-white p-6 shadow-card">
        <OrderPayClient
          orderId={order.id}
          amountHalalas={Math.round(Number(order.amountSar) * 100)}
          studentName={order.studentName}
          gatewayMode={gatewayMode()}
        />
      </div>
    </div>
  );
}
