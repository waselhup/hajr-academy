import Link from "next/link";
import { HajrLogo } from "@/components/brand/logo";
import { getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/shell/language-toggle";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Brand");
  return (
    <div className="relative min-h-screen bg-hajr-ivory">
      {/* subtle brand texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(48rem 26rem at 12% 0%, rgba(212,197,226,0.4), transparent 70%), radial-gradient(40rem 22rem at 100% 100%, rgba(181,229,216,0.32), transparent 70%)",
        }}
      />
      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center" aria-label={t("name")}>
            <HajrLogo size="sm" variant="full" />
          </Link>
          <LanguageToggle />
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex flex-col items-center text-center">
              <HajrLogo size="md" variant="mark" className="mb-4" />
              <h1 className="text-2xl font-extrabold text-hajr-navy">{t("name")}</h1>
              <p className="mt-1.5 text-sm text-hajr-gray-500">{t("tagline")}</p>
            </div>
            <div className="animate-fade-in-up">{children}</div>
          </div>
        </main>

        <footer className="px-4 pb-6 text-center text-xs text-hajr-gray-500">
          © <span className="num">2026</span> {t("fullName")}
        </footer>
      </div>
    </div>
  );
}
