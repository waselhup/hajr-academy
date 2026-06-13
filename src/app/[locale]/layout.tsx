import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Toaster } from "@/components/ui/toaster";
import { TopProgressBar } from "@/components/shared/top-progress-bar";
import { HtmlLangSync } from "@/components/shared/html-lang-sync";
import { BuildRecovery } from "@/components/shared/build-recovery";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "ar" | "en")) notFound();

  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div lang={locale} dir={dir} className={dir === "rtl" ? "font-ar" : "font-en"}>
      <NextIntlClientProvider messages={messages} locale={locale} timeZone="Asia/Riyadh">
        <HtmlLangSync />
        <BuildRecovery />
        <TopProgressBar />
        {children}
        <Toaster />
      </NextIntlClientProvider>
    </div>
  );
}
