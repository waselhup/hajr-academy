import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PolicyShell } from "../_shell";
import { getTerms } from "./content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isAr = locale === "ar";
  return {
    title: isAr
      ? "الشروط والأحكام | أكاديمية هجر"
      : "Terms & Conditions | HAJR Academy",
    description: isAr
      ? "الشروط والأحكام التي تحكم استخدام منصة أكاديمية هجر وشراء برامجها."
      : "The terms governing use of the HAJR Academy platform and the purchase of its programmes.",
    alternates: {
      canonical: `https://hajracademy.com/${locale}/policies/terms`,
      languages: {
        ar: "https://hajracademy.com/ar/policies/terms",
        en: "https://hajracademy.com/en/policies/terms",
      },
    },
  };
}

export default async function TermsPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const isAr = locale === "ar";
  const terms = getTerms(isAr);

  return (
    <PolicyShell
      isAr={isAr}
      title={terms.title}
      intro={terms.intro}
      sections={terms.sections}
      lastUpdatedLabel={t("Policies.lastUpdated")}
      whatsappLabel={t("Landing.whatsappFabLabel")}
      loginLabel={t("Landing.ctaLogin")}
      joinLabel={t("Landing.ctaStickyMobile")}
    />
  );
}
