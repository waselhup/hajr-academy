import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { HajrLogo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { SurveyForm } from "./survey-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Survey" });
  return { title: `${t("pageTitle")} · ${"Hajr"}`, description: t("pageSubtitle") };
}

/**
 * PUBLIC feedback survey (/survey) — no auth. The [locale] segment drives the
 * language and direction (the [locale] layout sets dir/lang), and the header
 * LanguageToggle swaps /ar/survey ↔ /en/survey so the whole form switches.
 * Shareable: the URL itself is the link; ?teacher=Name pre-fills the teacher.
 */
export default async function SurveyPage() {
  const t = await getTranslations("Survey");

  return (
    <div className="min-h-screen bg-hajr-ivory">
      <header className="sticky top-0 z-10 border-b border-hajr-border/70 bg-hajr-ivory/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" aria-label="Hajr">
            <HajrLogo size="sm" variant="full" />
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <section className="bg-hajr-deep-navy">
        <div className="container py-12 text-center sm:py-14">
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{t("pageTitle")}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/70 sm:text-base">
            {t("pageSubtitle")}
          </p>
        </div>
      </section>

      <main className="container py-8 sm:py-10">
        <SurveyForm />
      </main>
    </div>
  );
}
