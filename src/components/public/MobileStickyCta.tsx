"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

/**
 * Mobile bottom-sheet CTA — appears once the user scrolls past the hero.
 * Hidden on sm+ (where the desktop CTAs are always visible). Sits above
 * the WhatsApp FAB.
 */
export function MobileStickyCta({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-20 transform border-t border-white/10 bg-hajr-deep-navy p-3 transition-transform duration-200 sm:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <Link
        href="/register"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-hajr-rose text-sm font-semibold text-white shadow-sm transition-colors hover:bg-hajr-rose/90"
      >
        {label}
        <ArrowRight className="h-4 w-4 rtl-flip" />
      </Link>
    </div>
  );
}
