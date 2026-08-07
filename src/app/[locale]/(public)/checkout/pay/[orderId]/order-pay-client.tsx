"use client";

/**
 * Moyasar hosted form for a landing-page purchase order.
 *
 * Mirrors MoyasarPaymentForm but carries `purchase_order_id` metadata
 * instead of `invoice_id`, since a public buyer has no invoice yet.
 */

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Loader2 } from "lucide-react";

const MPF_VERSION = "1.14.0";
const MPF_JS = `https://cdn.moyasar.com/mpf/${MPF_VERSION}/moyasar.js`;
const MPF_CSS = `https://cdn.moyasar.com/mpf/${MPF_VERSION}/moyasar.css`;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function loadCss(href: string): void {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  document.head.appendChild(l);
}

export function OrderPayClient({
  orderId,
  amountHalalas,
  studentName,
  gatewayMode,
}: {
  orderId: string;
  amountHalalas: number;
  studentName: string;
  gatewayMode: "live" | "mock" | "misconfigured";
}) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const initialised = useRef(false);
  const [status, setStatus] = useState<
    "loading" | "ready" | "error" | "unavailable"
  >("loading");

  const publishableKey = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY ?? "";
  const applePayEnabled = process.env.NEXT_PUBLIC_MOYASAR_APPLE_PAY === "1";

  useEffect(() => {
    if (initialised.current) return;
    if (gatewayMode !== "live" || !publishableKey) {
      setStatus("unavailable");
      return;
    }

    initialised.current = true;
    loadCss(MPF_CSS);
    loadScript(MPF_JS)
      .then(() => {
        const w = window as unknown as {
          Moyasar?: { init: (c: Record<string, unknown>) => void };
        };
        if (!w.Moyasar) {
          setStatus("error");
          return;
        }
        const cb = new URL("/api/payments/callback", window.location.origin);
        cb.searchParams.set("locale", locale);
        cb.searchParams.set("success", `/${locale}/checkout/success`);
        cb.searchParams.set("failure", `/${locale}/checkout/pay/${orderId}`);
        w.Moyasar.init({
          element: ".moyasar-form",
          amount: amountHalalas,
          currency: "SAR",
          description: `HAJR Academy — ${studentName}`,
          publishable_api_key: publishableKey,
          callback_url: cb.toString(),
          methods: applePayEnabled
            ? ["creditcard", "applepay", "stcpay"]
            : ["creditcard", "stcpay"],
          metadata: { purchase_order_id: orderId },
          ...(applePayEnabled
            ? {
                apple_pay: {
                  country: "SA",
                  label: "HAJR Academy",
                  validate_merchant_url:
                    "https://api.moyasar.com/v1/applepay/initiate",
                },
              }
            : {}),
          language: isAr ? "ar" : "en",
        });
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [
    gatewayMode,
    publishableKey,
    amountHalalas,
    orderId,
    studentName,
    locale,
    isAr,
    applePayEnabled,
  ]);

  if (status === "unavailable") {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        {isAr
          ? "الدفع الإلكتروني غير متاح حالياً. تم حفظ طلبك وسيتواصل معك فريق هجر لإتمام السداد — لم يتم خصم أي مبلغ."
          : "Online payment is unavailable right now. Your order is saved and the Hajr team will contact you to complete it — nothing has been charged."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {status === "loading" && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-hajr-body">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isAr ? "جارٍ تحميل نموذج الدفع…" : "Loading payment form…"}
        </div>
      )}
      {status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {isAr
            ? "تعذّر تحميل نموذج الدفع. يرجى تحديث الصفحة."
            : "Could not load the payment form. Please refresh the page."}
        </div>
      )}
      <div className="moyasar-form" />
    </div>
  );
}
