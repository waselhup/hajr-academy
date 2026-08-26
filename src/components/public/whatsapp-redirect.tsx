"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Sends a paying customer into WhatsApp with the "I just paid" message
 * already typed, a few seconds after the confirmation page loads.
 *
 * Why the delay rather than an instant redirect: the buyer has just been
 * charged and needs to see that it worked. Yanking them off the confirmation
 * screen before they can read it reads like the payment failed.
 *
 * The auto-redirect fires once per order, remembered in sessionStorage, so
 * pressing "back" out of WhatsApp lands on the confirmation page and stays
 * there. The button never goes away and is the only path when JavaScript or
 * storage is unavailable — which is why the link is real markup, not an
 * onClick handler.
 */
export function WhatsAppRedirect({
  href,
  isAr,
  storageKey,
  delaySeconds = 4,
}: {
  href: string;
  isAr: boolean;
  storageKey: string;
  delaySeconds?: number;
}) {
  const [remaining, setRemaining] = useState(delaySeconds);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    let alreadySent = false;
    try {
      alreadySent = window.sessionStorage.getItem(storageKey) === "1";
    } catch {
      // Private mode / storage disabled — redirecting anyway is the safer
      // failure: the worst case is one extra hop the customer can go back from.
    }
    if (alreadySent) return;
    setAuto(true);

    const tick = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);

    const timer = setTimeout(() => {
      try {
        window.sessionStorage.setItem(storageKey, "1");
      } catch {
        /* ignore */
      }
      window.location.href = href;
    }, delaySeconds * 1000);

    return () => {
      clearInterval(tick);
      clearTimeout(timer);
    };
  }, [href, storageKey, delaySeconds]);

  return (
    <div className="mt-8 space-y-3">
      <Button asChild variant="cta" size="lg" className="w-full">
        {/* _self, not _blank: on mobile this hands the whole browser over to
            the WhatsApp app rather than stranding an empty tab behind it. */}
        <a href={href} target="_self" rel="noopener">
          <MessageCircle className="me-2 h-5 w-5" />
          {isAr ? "أكمل التسجيل عبر واتساب" : "Continue on WhatsApp"}
        </a>
      </Button>
      <p className="text-xs text-hajr-muted" aria-live="polite">
        {auto
          ? isAr
            ? `سيتم تحويلك إلى واتساب خلال ${remaining} ثانية…`
            : `Taking you to WhatsApp in ${remaining}s…`
          : isAr
            ? "اضغط الزر لفتح محادثة واتساب مع فريق هجر."
            : "Tap the button to open a WhatsApp chat with the HAJR team."}
      </p>
    </div>
  );
}
