"use client";

/**
 * MoyasarPaymentForm — embeds Moyasar's hosted payment form (MPF).
 *
 * Loads the Moyasar JS SDK + CSS from their CDN, then initialises the
 * embedded form for credit card, Apple Pay and STC Pay.
 *
 * When no publishable key is configured the component renders a
 * "mock pay" button instead, which posts straight to the callback route
 * with a synthesised payment id — so the billing flow can be walked
 * end-to-end in development.
 */

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const MPF_VERSION = "1.14.0";
const MPF_JS = `https://cdn.moyasar.com/mpf/${MPF_VERSION}/moyasar.js`;
const MPF_CSS = `https://cdn.moyasar.com/mpf/${MPF_VERSION}/moyasar.css`;

declare global {
  interface Window {
    Moyasar?: {
      init: (config: Record<string, unknown>) => void;
    };
  }
}

interface MoyasarPaymentFormProps {
  /** Amount in halalas (e.g. 25000 for 250.00 SAR). */
  amountHalalas: number;
  description: string;
  /** Our invoice id — round-tripped through metadata + callback. */
  invoiceId: string;
  /** Success page the payer lands on once the payment settles. */
  successUrl: string;
  /** Failure page; defaults to the student billing failure page. */
  failureUrl?: string;
  /**
   * Server's view of the gateway: `live` when MOYASAR_SECRET_KEY is set,
   * `mock` in local development, `misconfigured` when the two halves of the
   * configuration disagree. Passed from a server component because the
   * publishable key alone cannot tell the client whether the SERVER can
   * verify the resulting payment.
   */
  gatewayMode: "live" | "mock" | "misconfigured";
}

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

export function MoyasarPaymentForm({
  amountHalalas,
  description,
  invoiceId,
  successUrl,
  failureUrl,
  gatewayMode,
}: MoyasarPaymentFormProps) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const containerRef = useRef<HTMLDivElement>(null);
  const initialised = useRef(false);
  const [status, setStatus] = useState<
    "loading" | "ready" | "error" | "mock" | "misconfigured"
  >("loading");
  const [mockSubmitting, setMockSubmitting] = useState(false);

  const publishableKey = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY ?? "";
  const applePayEnabled =
    process.env.NEXT_PUBLIC_MOYASAR_APPLE_PAY === "1";

  useEffect(() => {
    if (initialised.current) return;

    // The server cannot verify what the browser would charge (or vice
    // versa) — refuse to take money rather than strand a real payment.
    if (gatewayMode === "misconfigured" || (gatewayMode === "live" && !publishableKey)) {
      setStatus("misconfigured");
      return;
    }

    // Development without keys → mock button instead of the hosted form.
    if (gatewayMode === "mock") {
      setStatus("mock");
      return;
    }

    initialised.current = true;
    loadCss(MPF_CSS);
    loadScript(MPF_JS)
      .then(() => {
        if (!window.Moyasar || !containerRef.current) {
          setStatus("error");
          return;
        }
        // Real Moyasar redirects to our server callback, which reconciles
        // the payment and then forwards to the success/failure page.
        const cb = new URL("/api/payments/callback", window.location.origin);
        cb.searchParams.set("locale", locale);
        cb.searchParams.set("success", successUrl);
        if (failureUrl) cb.searchParams.set("failure", failureUrl);
        const apiCallback = cb.toString();
        // Apple Pay additionally requires Moyasar's domain-association file
        // to be served from /.well-known on this domain and the domain to be
        // registered in the Moyasar dashboard. Until that is done the sheet
        // errors for every Safari user, so it stays behind a flag.
        window.Moyasar.init({
          element: ".moyasar-form",
          amount: amountHalalas,
          currency: "SAR",
          description,
          publishable_api_key: publishableKey,
          callback_url: apiCallback,
          methods: applePayEnabled
            ? ["creditcard", "applepay", "stcpay"]
            : ["creditcard", "stcpay"],
          metadata: { invoice_id: invoiceId },
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
    publishableKey,
    amountHalalas,
    description,
    invoiceId,
    locale,
    isAr,
    gatewayMode,
    successUrl,
    failureUrl,
    applePayEnabled,
  ]);

  /**
   * Mock-mode "pay" — creates + reconciles the payment server-side (the
   * mock Moyasar response is "paid"), then forwards to the success page.
   */
  async function handleMockPay() {
    setMockSubmitting(true);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, source: { type: "creditcard" } }),
      });
      const json = await res.json();
      const failBase = failureUrl ?? `/${locale}/student/billing/failure`;
      if (json.ok) {
        window.location.href = `${successUrl}?invoice=${encodeURIComponent(
          invoiceId
        )}`;
      } else {
        window.location.href = `${failBase}?reason=${encodeURIComponent(
          json.error ?? "mock-failed"
        )}`;
      }
    } catch {
      setMockSubmitting(false);
      const failBase = failureUrl ?? `/${locale}/student/billing/failure`;
      window.location.href = `${failBase}?reason=network`;
    }
  }

  if (status === "misconfigured") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {isAr
          ? "الدفع الإلكتروني غير متاح حالياً. يرجى التواصل مع الأكاديمية لإتمام السداد — لم يتم خصم أي مبلغ."
          : "Online payment is temporarily unavailable. Please contact the academy to settle this invoice — nothing has been charged."}
      </div>
    );
  }

  if (status === "mock") {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          {isAr
            ? "وضع الاختبار — لم يتم ضبط بوابة الدفع. الضغط على الزر سيحاكي عملية دفع ناجحة."
            : "Test mode — no payment gateway configured. Clicking the button simulates a successful payment."}
        </div>
        <Button
          className="w-full"
          size="lg"
          onClick={handleMockPay}
          disabled={mockSubmitting}
        >
          {mockSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {isAr
            ? `دفع ${(amountHalalas / 100).toFixed(2)} ر.س (اختبار)`
            : `Pay SAR ${(amountHalalas / 100).toFixed(2)} (test)`}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {status === "loading" && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isAr ? "جارٍ تحميل نموذج الدفع…" : "Loading payment form…"}
        </div>
      )}
      {status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {isAr
            ? "تعذّر تحميل نموذج الدفع. يرجى تحديث الصفحة أو التواصل مع الدعم."
            : "Could not load the payment form. Please refresh or contact support."}
        </div>
      )}
      <div ref={containerRef} className="moyasar-form" />
    </div>
  );
}
