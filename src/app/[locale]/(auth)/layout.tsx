import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/shell/language-toggle";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Brand");
  return (
    <div className="min-h-screen bg-brand-ivory">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>
        <LanguageToggle />
      </header>
      <main className="mx-auto flex max-w-md flex-col px-4 py-10 sm:py-16">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold text-brand-navy">{t("name")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("tagline")}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
