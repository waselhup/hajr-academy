/**
 * Shared shell for the public Policies pages.
 *
 * Re-uses the public landing header + footer pattern (logo, language toggle,
 * sign-in/register CTAs), plus the WhatsApp FAB. Server component — no
 * client state needed except the AnnouncementBar.
 */
import Link from "next/link";
import { HajrLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { WhatsAppFab } from "@/components/public/WhatsAppFab";
import { fmtDateLong } from "@/lib/format";

export function PolicyShell({
  isAr,
  title,
  body,
  lastUpdatedLabel,
  whatsappLabel,
  loginLabel,
  joinLabel,
}: {
  isAr: boolean;
  title: string;
  body: string;
  lastUpdatedLabel: string;
  whatsappLabel: string;
  loginLabel: string;
  joinLabel: string;
}) {
  // Sprint 1 ship date — bumped manually when copy is reviewed by legal.
  const lastUpdated = new Date("2026-05-27");
  return (
    <div className="min-h-screen bg-hajr-ivory">
      <header className="sticky top-0 z-20 border-b border-hajr-border/70 bg-hajr-ivory/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-2">
          <Link href="/" className="flex items-center">
            <HajrLogo size="sm" variant="full" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">{loginLabel}</Link>
            </Button>
            <Button variant="cta" size="pill" asChild>
              <Link href="/register">{joinLabel}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl py-14">
        <h1 className="text-3xl font-bold text-hajr-text sm:text-4xl">{title}</h1>
        <div className="mt-2 text-sm text-hajr-muted">
          {lastUpdatedLabel}: <span className="num">{fmtDateLong(lastUpdated, isAr ? "ar" : "en")}</span>
        </div>
        <div className="mt-8 space-y-4 leading-relaxed text-hajr-body">
          {body.split(/\n\n+/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </main>

      <footer className="border-t border-hajr-border bg-white">
        <div className="container py-8 text-center text-sm text-hajr-muted">
          <Link href="/" className="hover:text-hajr-text">
            ← {isAr ? "العودة للرئيسية" : "Back to home"}
          </Link>
        </div>
      </footer>

      <WhatsAppFab
        label={whatsappLabel}
        message={isAr ? "السلام عليكم، لدي استفسار" : "Hello, I have a question"}
      />
    </div>
  );
}
