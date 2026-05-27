import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HajrLogo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StartForm } from "./start-form";

const SLUG_TO_VARIANT: Record<string, "GENERAL_ENGLISH" | "STEP_PREP" | "IELTS_PREP"> = {
  general: "GENERAL_ENGLISH",
  step: "STEP_PREP",
  ielts: "IELTS_PREP",
};

export default async function PlacementVariantIntroPage({
  params,
}: {
  params: Promise<{ locale: string; variant: string }>;
}) {
  const { locale, variant } = await params;
  const variantKey = SLUG_TO_VARIANT[variant];
  if (!variantKey) notFound();

  const t = await getTranslations();
  const isAr = locale === "ar";

  const test = await prisma.placementTest.findFirst({
    where: { variant: variantKey, isActive: true },
    select: { id: true, durationMin: true, titleEn: true, titleAr: true, descriptionEn: true, descriptionAr: true },
  });
  if (!test) notFound();

  return (
    <div className="min-h-screen bg-hajr-ivory">
      <header className="border-b border-hajr-border/70 bg-hajr-ivory/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" aria-label={t("Brand.name")}>
            <HajrLogo size="sm" variant="full" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/placement-test`} className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5 rtl-flip" />
                {t("Common.back")}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="bg-hajr-deep-navy">
        <div className="container py-14 text-center sm:py-16">
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{isAr ? test.titleAr : test.titleEn}</h1>
          <p className="mx-auto mt-3 max-w-xl text-white/65">
            {isAr ? test.descriptionAr ?? "" : test.descriptionEn ?? ""}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
            <Clock className="h-3.5 w-3.5" /> {test.durationMin} min
          </div>
        </div>
      </section>

      <section className="container py-10">
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_1.1fr]">
          <div className="space-y-3 rounded-2xl border border-hajr-border bg-white p-5 shadow-card">
            <h2 className="text-lg font-bold text-hajr-text">{t("Placement.introHowItWorks")}</h2>
            <ol className="space-y-2 text-sm text-hajr-body">
              <li>1. {t("Placement.introStep1")}</li>
              <li>2. {t("Placement.introStep2")}</li>
              <li>3. {t("Placement.introStep3")}</li>
            </ol>
          </div>
          <StartForm variantSlug={variant} testId={test.id} />
        </div>
      </section>
    </div>
  );
}
