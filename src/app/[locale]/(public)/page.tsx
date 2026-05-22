import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { HajrLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ChatBubble from "@/components/public/ChatBubble";
import {
  GraduationCap, BookOpen, School, FlaskConical, Headphones,
  Calendar, ClipboardCheck, Users, Award, Check, ArrowRight, Star, Quote,
} from "lucide-react";

type Accent = "rose" | "mint" | "lavender";

const ACCENT: Record<Accent, { soft: string; icon: string; bar: string }> = {
  rose: { soft: "bg-hajr-rose/15", icon: "text-hajr-rose", bar: "bg-hajr-rose" },
  mint: { soft: "bg-hajr-mint/40", icon: "text-hajr-navy", bar: "bg-hajr-mint" },
  lavender: { soft: "bg-hajr-lavender/40", icon: "text-hajr-navy", bar: "bg-hajr-lavender" },
};

export default async function LandingPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const isAr = locale === "ar";

  const programs: { code: string; icon: any; accent: Accent; duration: string }[] = [
    { code: "STEP_PREP", icon: ClipboardCheck, accent: "lavender", duration: "16h" },
    { code: "PRIVATE", icon: BookOpen, accent: "mint", duration: "16h" },
    { code: "UNI_PREP", icon: GraduationCap, accent: "lavender", duration: "16h" },
    { code: "SCHOOL", icon: School, accent: "mint", duration: "12m" },
    { code: "ENGLISH_LAB", icon: FlaskConical, accent: "rose", duration: "∞" },
  ];

  const packages: {
    code: string; price: number; sessions: number; lab: boolean;
    featured: boolean; accent: Accent;
  }[] = [
    { code: "ESSENTIAL", price: 250, sessions: 8, lab: false, featured: false, accent: "lavender" },
    { code: "INTEGRATED", price: 300, sessions: 12, lab: true, featured: true, accent: "rose" },
    { code: "PRIVATE", price: 800, sessions: 16, lab: true, featured: false, accent: "mint" },
  ];

  const stats = [
    { value: "1,200+", label: t("Landing.statStudents") },
    { value: "45", label: t("Landing.statTeachers") },
    { value: "98%", label: t("Landing.statSatisfaction") },
    { value: "60k+", label: t("Landing.statHours") },
  ];

  const testimonials = isAr
    ? [
        { quote: "حسّنت ابنتي مستواها في الإنجليزية بشكل ملحوظ خلال فصل واحد. المدربون محترفون والمتابعة ممتازة.", name: "أم عبدالله", role: "ولية أمر" },
        { quote: "الإعداد لاختبار ستيب كان منظّماً ودقيقاً. حصلت على الدرجة التي أحتاجها للقبول الجامعي.", name: "فهد العتيبي", role: "طالب" },
        { quote: "مختبر اللغة يجعل التدريب ممتعاً وعملياً. أفضل تجربة تعليمية مررت بها.", name: "نورة القحطاني", role: "طالبة" },
      ]
    : [
        { quote: "My daughter's English improved dramatically in a single term. The instructors are professional and the follow-up is excellent.", name: "Umm Abdullah", role: "Parent" },
        { quote: "The STEP prep was structured and precise. I got the score I needed for university admission.", name: "Fahd Al-Otaibi", role: "Student" },
        { quote: "The English Lab makes practice fun and practical. The best learning experience I've had.", name: "Noura Al-Qahtani", role: "Student" },
      ];

  return (
    <div className="min-h-screen bg-hajr-ivory">
      {/* ── Top nav ───────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-hajr-gray-200/70 bg-hajr-ivory/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <HajrLogo size="sm" variant="full" />
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/login">{t("Landing.ctaLogin")}</Link>
            </Button>
            <Button variant="cta" size="pill" asChild>
              <Link href="/register">{t("Landing.ctaJoin")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60rem 30rem at 50% -10%, rgba(212,197,226,0.45), transparent 70%), radial-gradient(40rem 24rem at 90% 10%, rgba(181,229,216,0.35), transparent 70%)",
          }}
        />
        <div className="container flex flex-col items-center py-20 text-center sm:py-28">
          <div className="animate-fade-in">
            <Badge variant="info" className="mb-6 px-3 py-1">
              {t("Landing.heroEyebrow")}
            </Badge>
          </div>
          <div className="animate-fade-in-up [animation-delay:80ms]">
            <HajrLogo size="lg" variant="full" className="mb-8 items-center" />
          </div>
          <h1 className="animate-fade-in-up max-w-3xl text-4xl font-extrabold leading-[1.15] tracking-tight text-hajr-navy [animation-delay:160ms] sm:text-5xl">
            {t("Landing.heroTitle")}
          </h1>
          <p className="animate-fade-in-up mt-5 max-w-xl text-lg leading-relaxed text-hajr-gray-500 [animation-delay:240ms]">
            {t("Landing.heroSubtitleLong")}
          </p>
          <div className="animate-fade-in-up mt-9 flex flex-wrap items-center justify-center gap-3 [animation-delay:320ms]">
            <Button variant="cta" size="pill" asChild>
              <Link href="/register" className="gap-2">
                {t("Landing.ctaJoin")}
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </Link>
            </Button>
            <Button variant="outline" size="pill" asChild>
              <Link href="#programs">{t("Landing.programsTitle")}</Link>
            </Button>
          </div>

          {/* feature chips */}
          <div className="animate-fade-in-up mt-12 flex flex-wrap items-center justify-center gap-3 [animation-delay:400ms]">
            <FeatureChip icon={Calendar} label={t("Landing.featureFlex")} />
            <FeatureChip icon={Users} label={t("Landing.featureCert")} />
            <FeatureChip icon={Award} label={t("Landing.featurePractical")} />
            <FeatureChip icon={ClipboardCheck} label={t("Landing.featureMock")} />
          </div>
        </div>
      </section>

      {/* ── Stats band ────────────────────────────────────── */}
      <section className="border-y border-hajr-gray-200 bg-white">
        <div className="container grid grid-cols-2 gap-8 py-10 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="num text-3xl font-extrabold text-hajr-navy sm:text-4xl">{s.value}</div>
              <div className="mt-1 text-sm text-hajr-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Programs ──────────────────────────────────────── */}
      <section id="programs" className="container py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-hajr-navy sm:text-4xl">{t("Landing.programsTitle")}</h2>
          <p className="mt-3 text-hajr-gray-500">{t("Landing.programsSubtitle")}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => {
            const Icon = p.icon;
            const a = ACCENT[p.accent];
            return (
              <Card key={p.code} className="group relative overflow-hidden">
                <span className={`absolute inset-x-0 top-0 h-1 ${a.bar}`} />
                <CardHeader>
                  <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${a.soft}`}>
                    <Icon className={`h-7 w-7 ${a.icon}`} />
                  </div>
                  <CardTitle className="text-xl">{t("Programs." + p.code as any)}</CardTitle>
                  <CardDescription className="mt-1 inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="num">{p.duration}</span>
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Packages ──────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-hajr-navy sm:text-4xl">{t("Landing.packagesTitle")}</h2>
            <p className="mt-3 text-hajr-gray-500">{t("Landing.packagesSubtitle")}</p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3 md:items-center">
            {packages.map((pk) => (
              <Card
                key={pk.code}
                className={
                  pk.featured
                    ? "relative border-hajr-rose shadow-card-hover ring-1 ring-hajr-rose md:scale-105"
                    : "relative"
                }
              >
                {pk.featured && (
                  <div className="absolute -top-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
                    <Badge variant="rose" className="px-3 py-1 shadow-sm">
                      <Star className="me-1 h-3 w-3 fill-current" />
                      {t("Landing.packageMostPopular")}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pt-8 text-center">
                  <CardTitle className="text-lg">{t("Packages." + pk.code as any)}</CardTitle>
                  <div className="mt-4 flex items-baseline justify-center gap-1.5">
                    <span className="num text-5xl font-extrabold text-hajr-navy">{pk.price}</span>
                    <span className="text-sm text-hajr-gray-500">{t("Landing.sarPerMonth")}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm text-hajr-black">
                    <PackageFeature>
                      <span className="num font-semibold">{pk.sessions}</span>&nbsp;
                      {t("Landing.packageFeatureSessions")}
                    </PackageFeature>
                    {pk.lab && <PackageFeature>{t("Landing.packageFeatureLab")}</PackageFeature>}
                    <PackageFeature>{t("Landing.packageFeatureReports")}</PackageFeature>
                    {pk.featured && <PackageFeature>{t("Landing.packageFeatureSupport")}</PackageFeature>}
                  </ul>
                  <Button
                    asChild
                    variant={pk.featured ? "cta" : "outline"}
                    className="mt-7 w-full"
                  >
                    <Link href="/register">{t("Landing.ctaJoin")}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────── */}
      <section className="container py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-hajr-navy sm:text-4xl">{t("Landing.testimonialsTitle")}</h2>
          <p className="mt-3 text-hajr-gray-500">{t("Landing.testimonialsSubtitle")}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((tm) => (
            <Card key={tm.name} className="flex flex-col p-6">
              <Quote className="h-8 w-8 text-hajr-rose/30" />
              <p className="mt-3 flex-1 leading-relaxed text-hajr-black">{tm.quote}</p>
              <div className="mt-5 flex items-center gap-3 border-t border-hajr-gray-200 pt-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-hajr-lavender/50 text-sm font-semibold text-hajr-navy">
                  {tm.name.charAt(0)}
                </span>
                <div>
                  <div className="text-sm font-semibold text-hajr-navy">{tm.name}</div>
                  <div className="text-xs text-hajr-gray-500">{tm.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────────── */}
      <section className="container pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-hajr-navy px-8 py-14 text-center sm:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(30rem 16rem at 15% 20%, rgba(201,123,138,0.35), transparent 70%), radial-gradient(26rem 14rem at 90% 90%, rgba(181,229,216,0.22), transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold text-white sm:text-4xl">
              {t("Landing.ctaSectionTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">{t("Landing.ctaSectionSubtitle")}</p>
            <Button variant="cta" size="pill" asChild className="mt-8">
              <Link href="/register" className="gap-2">
                {t("Landing.ctaJoin")}
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="bg-hajr-navy text-white">
        <div className="container py-14">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <HajrLogo size="md" variant="full" light />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
                {t("Landing.footerTagline")}
              </p>
            </div>
            <FooterCol title={t("Landing.footerProductsTitle")}>
              <FooterLink href="#programs">{t("Programs.STEP_PREP")}</FooterLink>
              <FooterLink href="#programs">{t("Programs.UNI_PREP")}</FooterLink>
              <FooterLink href="#programs">{t("Programs.ENGLISH_LAB")}</FooterLink>
            </FooterCol>
            <FooterCol title={t("Landing.footerCompanyTitle")}>
              <FooterLink href="/login">{t("Landing.ctaLogin")}</FooterLink>
              <FooterLink href="/register">{t("Landing.ctaJoin")}</FooterLink>
            </FooterCol>
          </div>
          <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-white/50">
            © <span className="num">2026</span> {t("Brand.fullName")}. {t("Landing.footerRights")}
          </div>
        </div>
      </footer>

      <ChatBubble />
    </div>
  );
}

/* ── small presentational helpers ───────────────────────── */
function FeatureChip({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-hajr-gray-200 bg-white px-4 py-2 shadow-card">
      <Icon className="h-4 w-4 text-hajr-rose" />
      <span className="text-sm font-medium text-hajr-navy">{label}</span>
    </div>
  );
}

function PackageFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-hajr-mint">
        <Check className="h-3 w-3 text-hajr-navy" />
      </span>
      <span>{children}</span>
    </li>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-white">{title}</h3>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-white/60 transition-colors hover:text-hajr-rose">
        {children}
      </Link>
    </li>
  );
}
