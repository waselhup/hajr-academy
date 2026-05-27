import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { HajrLogo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MarketerApplyForm } from "./form";

export default async function MarketerApplyPage() {
  const t = await getTranslations();
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
              <Link href="/" className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5 rtl-flip" />
                {t("Common.back")}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="bg-hajr-deep-navy">
        <div className="container py-14 text-center sm:py-16">
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{t("Marketer.applyTitle")}</h1>
          <p className="mx-auto mt-3 max-w-xl text-white/65">{t("Marketer.applySubtitle")}</p>
        </div>
      </section>

      <section className="container py-10">
        <div className="mx-auto max-w-xl">
          <MarketerApplyForm />
        </div>
      </section>
    </div>
  );
}
