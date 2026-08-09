/**
 * Shared shell for the public Policies pages.
 *
 * Re-uses the public landing header + footer pattern (logo, language toggle,
 * sign-in/register CTAs), plus the WhatsApp FAB. Server component — no
 * client state needed except the AnnouncementBar.
 */
import { Link } from "@/i18n/routing";
import { HajrLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { WhatsAppFab } from "@/components/public/WhatsAppFab";
import { fmtDateLong } from "@/lib/format";
import { getLegalIdentity } from "@/lib/legal";

export interface PolicySection {
  heading: string;
  paragraphs: string[];
}

export function PolicyShell({
  isAr,
  title,
  body,
  intro,
  sections,
  showBank,
  lastUpdatedLabel,
  whatsappLabel,
  loginLabel,
  joinLabel,
}: {
  isAr: boolean;
  title: string;
  /** Plain-text policy — split on blank lines into paragraphs. */
  body?: string;
  intro?: string;
  /** Structured policy with real headings, for long documents like the terms. */
  sections?: PolicySection[];
  /** Show the bank-transfer details (payment policy only). */
  showBank?: boolean;
  lastUpdatedLabel: string;
  whatsappLabel: string;
  loginLabel: string;
  joinLabel: string;
}) {
  const legal = getLegalIdentity();
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
        {intro && <p className="mt-8 leading-relaxed text-hajr-body">{intro}</p>}

        {body && (
          <div className="mt-8 space-y-4 leading-relaxed text-hajr-body">
            {body.split(/\n\n+/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}

        {sections?.map((sec) => (
          <section key={sec.heading} className="mt-8">
            <h2 className="text-lg font-bold text-hajr-text">{sec.heading}</h2>
            <div className="mt-2 space-y-3 leading-relaxed text-hajr-body">
              {sec.paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>
        ))}

        {showBank && legal.bank && (
          <section className="mt-10 rounded-xl border border-hajr-border bg-white p-5 text-sm">
            <h2 className="mb-1 font-bold text-hajr-text">
              {isAr ? "الدفع بالتحويل البنكي" : "Payment by bank transfer"}
            </h2>
            <p className="mb-3 text-hajr-muted">
              {isAr
                ? "الدفع عبر الموقع هو الطريقة المعتمدة. للتحويل البنكي استخدم الحساب أدناه فقط، وأرسل لنا إيصال التحويل. لا نطلب التحويل إلى أي حساب آخر مهما كان."
                : "Paying on the website is the standard method. For a bank transfer use only the account below and send us the receipt. We never ask you to transfer to any other account."}
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Row label={isAr ? "البنك" : "Bank"} value={isAr ? legal.bank.nameAr : legal.bank.nameEn} />
              <Row label="IBAN" value={legal.bank.iban} num />
            </dl>
          </section>
        )}

        {/* Statutory identity. A Saudi e-commerce seller must publish who it
            is; the numbers print only when they are real, so the site never
            states a VAT registration the academy does not hold. */}
        <section className="mt-12 rounded-xl border border-hajr-border bg-white p-5 text-sm">
          <h2 className="mb-3 font-bold text-hajr-text">
            {isAr ? "الهوية النظامية" : "Legal identity"}
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Row
              label={isAr ? "الاسم" : "Name"}
              value={isAr ? legal.nameAr : legal.nameEn}
            />
            <Row
              label={isAr ? "العنوان" : "Address"}
              value={isAr ? legal.addressAr : legal.addressEn}
            />
            {legal.crNumber && (
              <Row
                label={isAr ? "السجل التجاري" : "Commercial registration"}
                value={legal.crNumber}
                num
              />
            )}
            {legal.vatNumber && (
              <Row label={isAr ? "الرقم الضريبي" : "VAT number"} value={legal.vatNumber} num />
            )}
            <Row label={isAr ? "البريد الإلكتروني" : "Email"} value={legal.email} num />
            <Row label={isAr ? "الجوال / واتساب" : "Phone / WhatsApp"} value={legal.phoneDisplay} num />
          </dl>
        </section>
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

function Row({ label, value, num }: { label: string; value: string; num?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-hajr-muted">{label}</dt>
      <dd className={num ? "num font-medium text-hajr-text" : "font-medium text-hajr-text"} dir={num ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}
