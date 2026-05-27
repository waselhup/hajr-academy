import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HajrLogo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";

const CEFR_COLORS: Record<string, string> = {
  A1: "#94A3B8",
  A2: "#64748B",
  B1: "#2563EB",
  B2: "#059669",
  C1: "#B86E7B",
  C2: "#1E2A36",
};

export default async function PlacementResultsPage({
  params,
}: {
  params: Promise<{ locale: string; attemptId: string }>;
}) {
  const { locale, attemptId } = await params;
  const t = await getTranslations();
  const isAr = locale === "ar";

  const result = await prisma.placementResult.findUnique({
    where: { attemptId },
    include: {
      attempt: { include: { test: { select: { titleEn: true, titleAr: true, variant: true } } } },
    },
  });
  if (!result) notFound();

  const breakdown = result.sectionBreakdown as Record<
    string,
    { titleEn: string; titleAr: string; score: number; max: number; percent: number }
  >;
  const recs = result.recommendations as Array<{
    packageType: string;
    reasonEn: string;
    reasonAr: string;
    confidence: number;
  }>;

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
          <p className="text-sm uppercase tracking-widest text-white/60">{t("Placement.resultTitle")}</p>
          <div
            className="mx-auto mt-4 inline-flex h-32 w-32 items-center justify-center rounded-3xl text-5xl font-extrabold text-white"
            style={{ background: CEFR_COLORS[result.cefrLevel] }}
          >
            {result.cefrLevel}
          </div>
          <div className="mt-3 text-2xl font-bold text-white">{t(`Placement.cefr_${result.cefrLevel}`)}</div>
          <div className="mt-1 text-sm text-white/70">
            {t("Placement.scoreLabel")}: {result.score}/{result.maxScore} ({Number(result.percent).toFixed(1)}%)
          </div>
        </div>
      </section>

      <section className="container py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Section breakdown */}
          <div className="rounded-2xl border border-hajr-border bg-white p-5 shadow-card">
            <h2 className="mb-3 text-lg font-bold text-hajr-text">
              {isAr ? "تفصيل الأقسام" : "Section breakdown"}
            </h2>
            <ul className="space-y-3">
              {Object.values(breakdown).map((s) => (
                <li key={s.titleEn}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-hajr-text">{isAr ? s.titleAr : s.titleEn}</span>
                    <span className="text-xs text-hajr-muted">
                      {s.score}/{s.max} ({s.percent.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-hajr-border">
                    <div className="h-full bg-hajr-mint" style={{ width: `${s.percent}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="rounded-2xl border border-hajr-border bg-white p-5 shadow-card">
            <h2 className="mb-3 text-lg font-bold text-hajr-text">{t("Placement.recommendationsTitle")}</h2>
            <ul className="space-y-3">
              {recs.map((r, i) => (
                <li
                  key={`${r.packageType}-${i}`}
                  className="rounded-xl border border-hajr-border bg-hajr-ivory p-4 border-s-4 border-s-hajr-rose"
                >
                  <div className="text-sm font-bold text-hajr-text">{r.packageType}</div>
                  <div className="mt-1 text-sm text-hajr-body">{isAr ? r.reasonAr : r.reasonEn}</div>
                </li>
              ))}
            </ul>
            <Link
              href={`/${locale}/register`}
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-hajr-rose px-4 text-sm font-semibold text-white shadow"
            >
              {t("Placement.enrollNow")}
            </Link>
          </div>

          {/* PDF */}
          {result.pdfUrl && (
            <a
              href={result.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-hajr-border bg-white px-4 text-sm font-semibold text-hajr-deep-navy hover:border-hajr-rose"
            >
              <Download className="h-4 w-4" />
              {t("Placement.downloadPdf")}
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
