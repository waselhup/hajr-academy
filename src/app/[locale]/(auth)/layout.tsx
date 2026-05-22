import Link from "next/link";
import { HajrLogo } from "@/components/brand/logo";
import { getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/shell/language-toggle";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Brand");
  return (
    <div className="relative min-h-screen bg-hajr-ivory">
      {/* navy header band — covers the top ~42% of the viewport */}
      <div className="absolute inset-x-0 top-0 h-[42vh] min-h-[280px] overflow-hidden bg-hajr-deep-navy">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(40rem 20rem at 15% 0%, rgba(255,255,255,0.05), transparent 70%), radial-gradient(32rem 18rem at 95% 30%, rgba(201,123,138,0.16), transparent 70%)",
          }}
        />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center" aria-label={t("name")}>
            <HajrLogo size="sm" variant="full" light />
          </Link>
          <LanguageToggle />
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-6 sm:py-10">
          <div className="w-full max-w-md">
            <div className="mb-7 flex flex-col items-center text-center">
              <HajrLogo size="md" variant="mark" light className="mb-4" />
              <p className="text-sm font-medium text-white/70">{t("tagline")}</p>
            </div>
            <div className="animate-fade-in-up">{children}</div>
          </div>
        </main>

        <footer className="px-4 pb-6 text-center text-xs text-hajr-muted">
          © <span className="num">2026</span> {t("fullName")}
        </footer>
      </div>
    </div>
  );
}
