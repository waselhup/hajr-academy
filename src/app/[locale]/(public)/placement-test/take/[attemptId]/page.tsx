import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { HajrLogo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { TakeClient } from "./client";

export default async function TakePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; attemptId: string }>;
  searchParams: Promise<{ sid?: string }>;
}) {
  const { locale, attemptId } = await params;
  const sp = await searchParams;
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-hajr-ivory">
      <header className="border-b border-hajr-border/70 bg-hajr-ivory/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" aria-label={t("Brand.name")}>
            <HajrLogo size="sm" variant="full" />
          </Link>
          <LanguageToggle />
        </div>
      </header>
      <TakeClient attemptId={attemptId} sessionId={sp.sid ?? ""} locale={locale} />
    </div>
  );
}
