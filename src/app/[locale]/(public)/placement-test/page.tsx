import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { HajrLogo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GraduationCap, BookOpen, ClipboardCheck } from "lucide-react";

export default async function PlacementHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  const isAr = locale === "ar";

  const variants = [
    {
      key: "GENERAL_ENGLISH",
      slug: "general",
      title: t("Placement.variantGeneral"),
      desc: isAr ? "اختر هذا إذا كنت تريد تقييم مستواك العام في الإنجليزية" : "Pick this if you want a general English level check",
      icon: BookOpen,
      duration: "30",
    },
    {
      key: "STEP_PREP",
      slug: "step",
      title: t("Placement.variantStep"),
      desc: isAr ? "اختر هذا إذا كنت تستعد لاختبار ستيب" : "Pick this if you're preparing for the STEP exam",
      icon: GraduationCap,
      duration: "45",
    },
    {
      key: "IELTS_PREP",
      slug: "ielts",
      title: t("Placement.variantIelts"),
      desc: isAr ? "اختر هذا إذا كنت تستعد لاختبار آيلتس" : "Pick this if you're preparing for IELTS",
      icon: ClipboardCheck,
      duration: "50",
    },
  ];

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
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{t("Placement.pageTitle")}</h1>
          <p className="mx-auto mt-3 max-w-xl text-white/65">{t("Placement.pageSubtitle")}</p>
        </div>
      </section>

      <section className="container py-12">
        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
          {variants.map((v) => {
            const Icon = v.icon;
            return (
              <Link
                key={v.key}
                href={`/${locale}/placement-test/${v.slug}`}
                className="group flex flex-col gap-3 rounded-2xl border border-hajr-border bg-white p-5 shadow-card transition hover:border-hajr-rose hover:shadow-card-hover"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-hajr-ivory">
                  <Icon className="h-6 w-6 text-hajr-deep-navy" />
                </div>
                <h3 className="text-lg font-bold text-hajr-text group-hover:text-hajr-rose">{v.title}</h3>
                <p className="text-sm text-hajr-muted">{v.desc}</p>
                <div className="text-xs text-hajr-muted">⏱ {v.duration} min</div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
