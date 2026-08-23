"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Auto-forwards a paying customer to WhatsApp with a pre-filled
 * "I just bought this package" message.
 *
 * The redirect fires once per order (guarded in sessionStorage) so pressing
 * "back" from WhatsApp does not bounce the customer straight out again. The
 * button below stays available either way, and is the only path when
 * JavaScript or the storage API is unavailable.
 */
export function WhatsAppRedirect({
  href,
  isAr,
  storageKey,
  delaySeconds = 3,
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
      // Private mode / storage disabled — fall back to redirecting anyway.
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
        <a href={href} target="_self" rel="noopener">
          <MessageCircle className="me-2 h-5 w-5" />
          {isAr ? "تابع معنا على واتساب" : "Continue with us on WhatsApp"}
        </a>
      </Button>
      <p className="text-xs text-hajr-muted" aria-live="polite">
        {auto
          ? isAr
            ? `سيتم تحويلك إلى واتساب خلال ${remaining} ثانية…`
            : `Redirecting you to WhatsApp in ${remaining}s…`
          : isAr
            ? "اضغط الزر لفتح محادثة واتساب مع فريق هجر."
            : "Tap the button to open a WhatsApp chat with the Hajr team."}
      </p>
    </div>
  );
}
