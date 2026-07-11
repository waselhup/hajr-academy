import { Link } from "@/i18n/routing";
import { getTranslations, getLocale } from "next-intl/server";
import { HajrLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ChatBubble from "@/components/public/ChatBubble";
import { ContactForm } from "./contact-form";
import { AnnouncementBar } from "@/components/public/AnnouncementBar";
import { WhatsAppFab } from "@/components/public/WhatsAppFab";
import { MobileStickyCta } from "@/components/public/MobileStickyCta";
import {
  GraduationCap, BookOpen, School,
  Calendar, ClipboardCheck, Users, User, Award, Check, ArrowRight, Star, Quote,
  Target, TrendingUp, HeartHandshake, ShieldCheck, Mail, Phone, MapPin,
  Twitter, Instagram, MessageCircle, Music2, Ghost, ShieldCheck as VerifyIcon,
  PlayCircle, Rocket, Sparkles, Zap, Trophy, BadgeCheck, Lock, ReceiptText,
  BarChart3, ChevronDown, Compass,
} from "lucide-react";

export default async function LandingPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const isAr = locale === "ar";

  const stats = [
    { value: "1,200+", label: t("Landing.statStudents") },
    { value: "45", label: t("Landing.statTeachers") },
    { value: "98%", label: t("Landing.statSatisfaction") },
    { value: "60k+", label: t("Landing.statHours") },
  ];

  const howSteps: { n: string; icon: any; title: string; desc: string }[] = [
    { n: "1", icon: ClipboardCheck, title: t("Landing.howStep1Title"), desc: t("Landing.howStep1Desc") },
    { n: "2", icon: PlayCircle, title: t("Landing.howStep2Title"), desc: t("Landing.howStep2Desc") },
    { n: "3", icon: Rocket, title: t("Landing.howStep3Title"), desc: t("Landing.howStep3Desc") },
  ];

  const services: { icon: any; title: string; desc: string }[] = [
    { icon: ClipboardCheck, title: t("Landing.svcStepTitle"), desc: t("Landing.svcStepDesc") },
    { icon: Award, title: t("Landing.svcIeltsTitle"), desc: t("Landing.svcIeltsDesc") },
    { icon: GraduationCap, title: t("Landing.svcUniTitle"), desc: t("Landing.svcUniDesc") },
    { icon: User, title: t("Landing.svcPrivateTitle"), desc: t("Landing.svcPrivateDesc") },
    { icon: Users, title: t("Landing.svcGroupTitle"), desc: t("Landing.svcGroupDesc") },
    { icon: School, title: t("Landing.svcSchoolTitle"), desc: t("Landing.svcSchoolDesc") },
  ];

  const labPoints: { icon: any; label: string }[] = [
    { icon: Sparkles, label: t("Landing.labPoint1") },
    { icon: Zap, label: t("Landing.labPoint2") },
    { icon: Trophy, label: t("Landing.labPoint3") },
  ];

  const values: { icon: any; title: string; desc: string }[] = [
    { icon: Target, title: t("Landing.valueAchievementTitle"), desc: t("Landing.valueAchievementDesc") },
    { icon: TrendingUp, title: t("Landing.valueGrowthTitle"), desc: t("Landing.valueGrowthDesc") },
    { icon: HeartHandshake, title: t("Landing.valueCommunityTitle"), desc: t("Landing.valueCommunityDesc") },
    { icon: ShieldCheck, title: t("Landing.valueConfidenceTitle"), desc: t("Landing.valueConfidenceDesc") },
  ];

  const trust: { icon: any; title: string; desc: string }[] = [
    { icon: BadgeCheck, title: t("Landing.trustCertTitle"), desc: t("Landing.trustCertDesc") },
    { icon: Lock, title: t("Landing.trustSecureTitle"), desc: t("Landing.trustSecureDesc") },
    { icon: ReceiptText, title: t("Landing.trustZatcaTitle"), desc: t("Landing.trustZatcaDesc") },
    { icon: BarChart3, title: t("Landing.trustReportsTitle"), desc: t("Landing.trustReportsDesc") },
  ];

  const faqs = Array.from({ length: 8 }, (_, i) => ({
    q: t(`Landing.faqQ${i + 1}` as any),
    a: t(`Landing.faqA${i + 1}` as any),
  }));

  const packages: {
    code: string; price: number; sessions: number; lab: boolean; featured: boolean;
  }[] = [
    { code: "ESSENTIAL", price: 250, sessions: 8, lab: false, featured: false },
    { code: "INTEGRATED", price: 300, sessions: 12, lab: true, featured: true },
    { code: "PRIVATE", price: 800, sessions: 16, lab: true, featured: false },
    { code: "STEP_PREP_PKG", price: 600, sessions: 16, lab: true, featured: false },
    { code: "IELTS_PREP_PKG", price: 800, sessions: 16, lab: true, featured: false },
  ];

  // Testimonials — navy avatars with initials (no invented photos). Bilingual.
  const testimonials = isAr
    ? [
        { quote: "نتائج ولدي تحسنت بشكل ملحوظ خلال فصل واحد. متابعة ممتازة والمدربون محترفون.", name: "أم محمد", role: "ولية أمر", stars: 5 },
        { quote: "أفضل تجربة تعلم إنجليزي مررت بها. الإعداد لستيب دقيق ومنظّم.", name: "فهد العتيبي", role: "طالب", stars: 5 },
        { quote: "حصلت على 95 في ستيب بفضل التدريب المركّز هنا.", name: "عبدالرحمن", role: "طالب", stars: 5 },
        { quote: "متابعة مستمرة وتقارير شهرية واضحة عن مستوى ابنتي.", name: "نورة", role: "ولية أمر", stars: 5 },
        { quote: "معلمون رائعون ومنصة سهلة، ابنتي تحب الحصص كثيرًا.", name: "سارة الحسن", role: "ولية أمر", stars: 5 },
        { quote: "نقلة حقيقية في تحضيري لاختبار آيلتس. أنصح بها بشدة.", name: "أحمد ك.", role: "طالب", stars: 5 },
      ]
    : [
        { quote: "My son improved dramatically in a single term. Excellent follow-up and professional instructors.", name: "Umm Mohammed", role: "Parent", stars: 5 },
        { quote: "Best English learning experience I've had. STEP prep is structured and precise.", name: "Fahd Al-Otaibi", role: "Student", stars: 5 },
        { quote: "I scored 95 on STEP thanks to the focused training here.", name: "Abdulrahman", role: "Student", stars: 5 },
        { quote: "Continuous follow-up and clear monthly reports on my daughter's progress.", name: "Noura", role: "Parent", stars: 5 },
        { quote: "Excellent teachers and platform, my daughter loves the lessons.", name: "Sarah Al-Hassan", role: "Parent", stars: 5 },
        { quote: "Game changer for my IELTS prep. Highly recommended.", name: "Ahmed K.", role: "Student", stars: 5 },
      ];

  const navLinks = [
    { href: "#programs", label: t("Landing.navPrograms") },
    { href: "#teachers", label: t("Landing.navTeachers") },
    { href: "#packages", label: t("Landing.navPricing") },
    { href: "#about", label: t("Landing.navAbout") },
    { href: "#contact", label: t("Landing.navContact") },
  ];

  return (
    <div className="min-h-screen bg-hajr-ivory">
      {/* ── Announcement bar ─────────────────────────────── */}
      <AnnouncementBar
        message={t("Landing.announcementBar")}
        dismissLabel={t("Landing.announcementDismiss")}
      />

      {/* ── Top nav ───────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-hajr-border/70 bg-hajr-ivory/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-2">
          <HajrLogo size="sm" variant="full" />
          <nav className="hidden items-center gap-7 lg:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-hajr-body transition-colors hover:text-hajr-deep-navy"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <LanguageToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">{t("Landing.ctaLogin")}</Link>
            </Button>
            <Button size="lg" className="px-5 sm:px-6" asChild>
              <Link href="/register">{t("Landing.ctaStickyMobile")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero — Deep Navy ──────────────────────────────── */}
      <section className="relative overflow-hidden bg-hajr-deep-navy">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(58rem 30rem at 50% -12%, rgba(255,255,255,0.06), transparent 70%)",
          }}
        />
        <GatewayLines />
        <AoWatermark />
        <div className="container relative flex flex-col items-center pb-28 pt-16 text-center sm:pb-36 sm:pt-24">
          <div className="animate-fade-in">
            <span className="mb-6 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-white/80">
              {t("Landing.heroEyebrow")}
            </span>
          </div>
          <div className="animate-fade-in-up [animation-delay:80ms]">
            <HajrLogo size="lg" variant="full" light className="mb-8 items-center" />
          </div>
          <h1 className="animate-fade-in-up max-w-3xl text-4xl font-semibold leading-[1.15] tracking-tight text-white [animation-delay:160ms] sm:text-5xl">
            {t("Landing.heroTitle")}
          </h1>
          <p className="animate-fade-in-up mt-5 max-w-xl text-lg leading-relaxed text-white/70 [animation-delay:240ms]">
            {t("Landing.heroSubtitleLong")}
          </p>
          <div className="animate-fade-in-up mt-9 flex flex-wrap items-center justify-center gap-3 [animation-delay:320ms]">
            <Button variant="cta" size="lg" asChild>
              <Link href="/placement-test" className="gap-2">
                {t("Landing.ctaPlacementFree")}
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </Link>
            </Button>
            <Button
              size="lg"
              asChild
              className="border border-white/25 bg-transparent text-white hover:bg-white/10"
            >
              <Link href="/contact?subject=PROGRAMS">{t("Landing.ctaBookTrial")}</Link>
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

      {/* ── Stats band — floating card overlapping the hero ─── */}
      <section className="container relative z-10 -mt-16 sm:-mt-20">
        <div className="grid grid-cols-2 divide-y divide-hajr-border rounded-card border border-hajr-border bg-white p-2 shadow-card sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse">
          {stats.map((s) => (
            <div key={s.label} className="px-4 py-6 text-center sm:py-8">
              <div className="num text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{s.value}</div>
              <div className="mt-1 text-sm text-hajr-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── About / Mission / Vision (من نحن) ──────────────── */}
      <section id="about" className="container py-20 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <SectionEyebrow>{t("Landing.aboutEyebrow")}</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">
              {t("Landing.aboutTitle")}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-hajr-body">{t("Landing.aboutBody")}</p>
          </div>
          <div className="grid gap-5">
            <Card className="relative overflow-hidden p-6 sm:p-7">
              <span className="absolute inset-y-0 start-0 w-1 bg-hajr-rose" />
              <div className="flex items-start gap-4">
                <span className="icon-chip h-11 w-11 shrink-0">
                  <Compass className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-hajr-deep-navy">{t("Landing.missionTitle")}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-hajr-body">{t("Landing.missionBody")}</p>
                </div>
              </div>
            </Card>
            <Card className="relative overflow-hidden p-6 sm:p-7">
              <span className="absolute inset-y-0 start-0 w-1 bg-hajr-deep-navy" />
              <div className="flex items-start gap-4">
                <span className="icon-chip h-11 w-11 shrink-0">
                  <Target className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-hajr-deep-navy">{t("Landing.visionTitle")}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-hajr-body">{t("Landing.visionBody")}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-24">
        <div className="container">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <SectionEyebrow center>{t("Landing.howTitle")}</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.howTitle")}</h2>
            <p className="mt-3 text-hajr-muted">{t("Landing.howSubtitle")}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {howSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.n} className="relative rounded-card border border-hajr-border bg-hajr-ivory/60 p-7 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-hajr-deep-navy text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="num mt-4 text-xs font-semibold tracking-widest text-hajr-rose">
                    {step.n} / 3
                  </div>
                  <h3 className="mt-1 text-lg font-semibold text-hajr-deep-navy">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-hajr-muted">{step.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <Button variant="cta" size="lg" asChild>
              <Link href="/placement-test" className="gap-2">
                {t("Landing.ctaPlacementFree")}
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Services / Programs ───────────────────────────── */}
      <section id="programs" className="container py-20 sm:py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <SectionEyebrow center>{t("Landing.servicesTitle")}</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.servicesTitle")}</h2>
          <p className="mt-3 text-hajr-muted">{t("Landing.servicesSubtitle")}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.title} className="group relative overflow-hidden p-6">
                <span className="absolute inset-x-0 top-0 h-1 bg-hajr-deep-navy" />
                <div className="icon-chip mb-4 h-14 w-14 rounded-2xl">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold text-hajr-deep-navy">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-hajr-muted">{s.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── English Lab spotlight — Deep Navy band ─────────── */}
      <section className="relative overflow-hidden bg-hajr-deep-navy py-20 sm:py-24">
        <AoWatermark />
        <div className="container relative grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <SectionEyebrow light>{t("Landing.labEyebrow")}</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{t("Landing.labTitle")}</h2>
            <p className="mt-5 text-lg leading-relaxed text-white/70">{t("Landing.labBody")}</p>
            <div className="mt-8">
              <Button variant="cta" size="lg" asChild>
                <Link href="/register" className="gap-2">
                  {t("Landing.labCta")}
                  <ArrowRight className="h-4 w-4 rtl-flip" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            {labPoints.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.label} className="flex items-center gap-4 rounded-card border border-white/10 bg-white/[0.04] p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-hajr-mint">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-base font-medium text-white">{p.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why HAJR — value pillars ──────────────────────── */}
      <section className="container py-20 sm:py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <SectionEyebrow center>{t("Landing.valuesTitle")}</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.valuesTitle")}</h2>
          <p className="mt-3 text-hajr-muted">{t("Landing.valuesSubtitle")}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => {
            const Icon = v.icon;
            return (
              <Card key={v.title} className="p-6">
                <div className="icon-chip mb-4 h-12 w-12">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-hajr-deep-navy">{v.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-hajr-muted">{v.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Teachers ──────────────────────────────────────── */}
      <section id="teachers" className="bg-white py-20 sm:py-24">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <SectionEyebrow center>{t("Landing.teachersEyebrow")}</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.teachersTitle")}</h2>
            <p className="mt-3 text-hajr-muted">{t("Landing.teachersSubtitle")}</p>
          </div>
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[GraduationCap, BookOpen, Users, BadgeCheck].map((Icon, i) => (
              <div key={i} className="rounded-card border border-hajr-border bg-hajr-ivory/50 p-6 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-hajr-deep-navy text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <div className="mt-3 text-sm font-medium text-hajr-body">{t("Landing.featureCert")}</div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button size="lg" asChild>
              <Link href="/teachers" className="gap-2">
                {t("Landing.teachersCta")}
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Packages / Pricing ────────────────────────────── */}
      <section id="packages" className="container py-20 sm:py-24">
        <div className="mx-auto mb-6 max-w-2xl text-center">
          <SectionEyebrow center>{t("Landing.packagesTitle")}</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.packagesTitle")}</h2>
          <p className="mt-3 text-hajr-muted">{t("Landing.packagesSubtitle")}</p>
        </div>
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3 md:items-stretch">
          {packages.map((pk) => {
            const featured = pk.featured;
            return (
              <Card
                key={pk.code}
                className={
                  featured
                    ? "relative flex flex-col border-transparent bg-hajr-deep-navy text-white shadow-card-hover md:scale-[1.03]"
                    : "relative flex flex-col"
                }
              >
                {featured && (
                  <div className="absolute -top-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-hajr-rose px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      <Star className="me-1 h-3 w-3 fill-current" />
                      {t("Landing.packageMostPopular")}
                    </span>
                  </div>
                )}
                <CardHeader className="pt-8 text-center">
                  <CardTitle className={featured ? "text-lg text-white" : "text-lg text-hajr-deep-navy"}>
                    {t("Packages." + pk.code as any)}
                  </CardTitle>
                  <div className="mt-4 flex items-baseline justify-center gap-1.5">
                    <span className={`num text-5xl font-semibold ${featured ? "text-white" : "text-hajr-deep-navy"}`}>
                      {pk.price}
                    </span>
                    <span className={featured ? "text-sm text-white/70" : "text-sm text-hajr-muted"}>
                      {t("Landing.sarPerMonth")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className={`space-y-3 text-sm ${featured ? "text-white/85" : "text-hajr-body"}`}>
                    <PackageFeature featured={featured}>
                      <span className="num font-semibold">{pk.sessions}</span>&nbsp;
                      {t("Landing.packageFeatureSessions")}
                    </PackageFeature>
                    {pk.lab && <PackageFeature featured={featured}>{t("Landing.packageFeatureLab")}</PackageFeature>}
                    <PackageFeature featured={featured}>{t("Landing.packageFeatureReports")}</PackageFeature>
                    {featured && <PackageFeature featured={featured}>{t("Landing.packageFeatureSupport")}</PackageFeature>}
                  </ul>
                  <Button
                    asChild
                    variant={featured ? "success" : "default"}
                    className={featured ? "mt-7 w-full bg-white text-hajr-deep-navy hover:bg-white/90" : "mt-7 w-full"}
                  >
                    <Link href={`/checkout?package=${pk.code}`}>{t("Landing.ctaChoosePlan")}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="mt-6 text-center text-xs text-hajr-muted">{t("Landing.packagesVatNote")}</p>
      </section>

      {/* ── Trust / guarantee ─────────────────────────────── */}
      <section className="bg-white py-20 sm:py-24">
        <div className="container">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <SectionEyebrow center>{t("Landing.trustTitle")}</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.trustTitle")}</h2>
            <p className="mt-3 text-hajr-muted">{t("Landing.trustSubtitle")}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((tr) => {
              const Icon = tr.icon;
              return (
                <Card key={tr.title} className="p-6 text-center">
                  <div className="icon-chip mx-auto mb-4 h-12 w-12">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-semibold text-hajr-deep-navy">{tr.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-hajr-muted">{tr.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────── */}
      <section className="container py-20 sm:py-24">
        <div className="mx-auto mb-3 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hajr-border bg-white px-3 py-1 text-xs font-medium text-hajr-deep-navy shadow-card">
            <VerifyIcon className="h-3.5 w-3.5" />
            {t("Landing.trustBadge")}
          </span>
        </div>
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.testimonialsTitle")}</h2>
          <p className="mt-3 text-hajr-muted">{t("Landing.testimonialsSubtitle")}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((tm, i) => (
            <Card key={tm.name + i} className="flex flex-col p-6">
              <div className="mb-3 flex items-center gap-0.5">
                {Array.from({ length: tm.stars }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-hajr-rose text-hajr-rose" />
                ))}
              </div>
              <Quote className="h-7 w-7 text-hajr-border" />
              <p className="mt-3 flex-1 leading-relaxed text-hajr-body">&ldquo;{tm.quote}&rdquo;</p>
              <div className="mt-5 flex items-center gap-3 border-t border-hajr-border pt-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-hajr-deep-navy text-sm font-semibold text-white shadow-sm">
                  {tm.name.charAt(0)}
                </span>
                <div>
                  <div className="text-sm font-semibold text-hajr-deep-navy">{tm.name}</div>
                  <div className="text-xs text-hajr-muted">{tm.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-24">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <SectionEyebrow center>{t("Landing.faqTitle")}</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.faqTitle")}</h2>
            <p className="mt-3 text-hajr-muted">{t("Landing.faqSubtitle")}</p>
          </div>
          <div className="mx-auto max-w-3xl divide-y divide-hajr-border overflow-hidden rounded-card border border-hajr-border bg-white">
            {faqs.map((f, i) => (
              <details key={i} className="group px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-start [&::-webkit-details-marker]:hidden">
                  <span className="text-base font-semibold text-hajr-deep-navy">{f.q}</span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-hajr-muted transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="pb-5 leading-relaxed text-hajr-body">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ───────────────────────────────────────── */}
      <section id="contact" className="container py-20 sm:py-24">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.contactTitle")}</h2>
            <p className="mt-3 leading-relaxed text-hajr-muted">{t("Landing.contactSubtitle")}</p>
            <div className="mt-8 space-y-4">
              <ContactRow icon={Mail} label={t("Landing.contactEmailLabel")} value="hello@hajracademy.com" />
              <ContactRow icon={Phone} label={t("Landing.contactPhoneLabel")} value="+966 11 000 0000" />
              <ContactRow icon={MapPin} label={t("Landing.contactAddressLabel")} value={t("Landing.contactAddressValue")} />
            </div>
          </div>
          <Card className="p-6 sm:p-8">
            <ContactForm />
          </Card>
        </div>
      </section>

      {/* ── Final CTA banner — Deep Navy ──────────────────── */}
      <section className="container pb-20">
        <div className="relative overflow-hidden rounded-card bg-hajr-deep-navy px-8 py-14 text-center shadow-card sm:px-16">
          <AoWatermark />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
              {t("Landing.ctaSectionTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">{t("Landing.ctaSectionSubtitle")}</p>
            <Button variant="cta" size="lg" asChild className="mt-8">
              <Link href="/placement-test" className="gap-2">
                {t("Landing.ctaPlacementFree")}
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer — Deep Navy ────────────────────────────── */}
      <footer className="bg-hajr-deep-navy text-white">
        <div className="container py-14">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
            <div>
              <HajrLogo size="md" variant="full" light />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
                {t("Landing.footerTagline")}
              </p>
            </div>
            <FooterCol title={t("Landing.footerProductsTitle")}>
              <FooterLink href="#programs">{t("Landing.svcStepTitle")}</FooterLink>
              <FooterLink href="#programs">{t("Landing.svcIeltsTitle")}</FooterLink>
              <FooterLink href="#programs">{t("Landing.svcUniTitle")}</FooterLink>
              <FooterLink href="/placement-test">{t("Landing.howStep1Title")}</FooterLink>
            </FooterCol>
            <FooterCol title={t("Landing.socialConnect")}>
              <SocialIconRow />
            </FooterCol>
            <FooterCol title={t("Landing.footerPoliciesTitle")}>
              <FooterLink href="/policies/payment">{t("Policies.paymentPolicyTitle")}</FooterLink>
              <FooterLink href="/policies/refund">{t("Policies.refundPolicyTitle")}</FooterLink>
              <FooterLink href="/policies/privacy">{t("Policies.privacyPolicyTitle")}</FooterLink>
            </FooterCol>
            <FooterCol title={t("Landing.footerContactTitle")}>
              <FooterLink href="/contact">{t("Landing.contactTitle")}</FooterLink>
              <FooterLink href="/login">{t("Landing.ctaLogin")}</FooterLink>
              <FooterLink href="/register">{t("Landing.ctaChoosePlan")}</FooterLink>
            </FooterCol>
          </div>
          <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-white/45">
            © <span className="num">{new Date().getFullYear()}</span> {t("Brand.fullName")}. {t("Landing.footerRights")}
          </div>
        </div>
      </footer>

      <WhatsAppFab
        label={t("Landing.whatsappFabLabel")}
        message={isAr ? "السلام عليكم، أرغب في الاستفسار عن برامج أكاديمية هجر" : "Hello, I'd like to ask about Hajr Academy programs"}
      />
      <MobileStickyCta label={t("Landing.ctaStickyMobile")} />

      <ChatBubble />
    </div>
  );
}

/* ── Signature brand motifs ──────────────────────────────── */
// Gateway Lines: a pair of thin vertical hairlines near the leading edge —
// a subtle structural motif from the brand book.
function GatewayLines() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 start-6 hidden sm:block">
      <div className="absolute inset-y-0 start-0 w-px bg-white/10" />
      <div className="absolute inset-y-0 start-3 w-px bg-white/[0.06]" />
    </div>
  );
}

// A° Watermark: a large, faint degree-mark A° for quiet brand presence on
// navy bands.
function AoWatermark() {
  return (
    <span
      aria-hidden
      dir="ltr"
      className="pointer-events-none absolute -bottom-10 end-6 select-none font-en text-[12rem] font-light leading-none text-white/[0.04] sm:text-[16rem]"
    >
      A°
    </span>
  );
}

/* ── small presentational helpers ───────────────────────── */
function SectionEyebrow({
  children,
  center,
  light,
}: {
  children: React.ReactNode;
  center?: boolean;
  light?: boolean;
}) {
  return (
    <div className={center ? "flex justify-center" : ""}>
      <span
        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
          light
            ? "border-white/20 bg-white/5 text-hajr-mint"
            : "border-hajr-border bg-white text-hajr-rose"
        }`}
      >
        {children}
      </span>
    </div>
  );
}

function FeatureChip({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2">
      <Icon className="h-4 w-4 text-white/80" />
      <span className="text-sm font-medium text-white">{label}</span>
    </div>
  );
}

function PackageFeature({ children, featured }: { children: React.ReactNode; featured?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          featured ? "bg-hajr-mint" : "bg-hajr-mint"
        }`}
      >
        <Check className="h-3 w-3 text-hajr-deep-navy" />
      </span>
      <span>{children}</span>
    </li>
  );
}

function ContactRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="icon-chip shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-hajr-light">{label}</div>
        <div className="text-sm font-semibold text-hajr-deep-navy">{value}</div>
      </div>
    </div>
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
  const cls = "text-sm text-white/55 transition-colors hover:text-white";
  const isInternalPath = href.startsWith("/");
  return (
    <li>
      {isInternalPath ? (
        <Link href={href} className={cls}>{children}</Link>
      ) : (
        <a href={href} className={cls}>{children}</a>
      )}
    </li>
  );
}

// Social handles the academy is active on. Add a `href` to make an icon a real
// link; entries without one render as non-interactive placeholders (never dead
// "#" links). Owner can fill these in as accounts go live.
const SOCIAL_LINKS: { Icon: any; label: string; href?: string }[] = [
  { Icon: Twitter, label: "Twitter / X" },
  { Icon: Instagram, label: "Instagram" },
  { Icon: MessageCircle, label: "WhatsApp" },
  { Icon: Music2, label: "TikTok" },
  { Icon: Ghost, label: "Snapchat" },
];

function SocialIconRow() {
  const live = SOCIAL_LINKS.filter((s) => s.href);
  if (live.length === 0) return null;
  return (
    <li className="!mt-0 flex gap-2">
      {live.map(({ Icon, label, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </li>
  );
}
