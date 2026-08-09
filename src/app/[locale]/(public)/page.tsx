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
import { BRAND } from "@/lib/brand";
import { listActiveProducts } from "@/lib/finance/catalog";
import {
  GraduationCap, BookOpen, Globe, Briefcase, FileText, FileCheck,
  Calendar, ClipboardCheck, Users, User, Award, Check, ArrowRight, Star, Quote,
  ShieldCheck, Mail, Phone, MapPin, MonitorPlay, UserCheck, Building2, Gift,
  Twitter, Instagram, MessageCircle, Music2, Ghost, ShieldCheck as VerifyIcon,
  Rocket, Sparkles, Zap, Trophy, BadgeCheck, Lock, ReceiptText,
  BarChart3, ChevronDown, Compass,
} from "lucide-react";

const WA = BRAND.contact.whatsapp; // "966502456651"

export default async function LandingPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const isAr = locale === "ar";

  // WhatsApp deep links with a pre-filled message (booking is WhatsApp-first).
  const wa = (msg: string) => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  // Trial booking goes through /trial, not straight to WhatsApp: the visitor
  // sees the times that actually exist, and the academy ends up with a record
  // of who asked. The WhatsApp message is offered AFTER the booking is saved.
  const trialHref = `/${locale}/trial`;
  const waPlan = (name: string) =>
    wa(isAr ? `السلام عليكم، أرغب في الاشتراك في: ${name}` : `Hello, I'd like to enroll in: ${name}`);

  // Prices come from the owner-editable catalogue so what is displayed and
  // what is charged can never drift apart. `bySlug` falls back to the
  // hard-coded copy below if a row is missing, so the page never breaks.
  const catalogue = await listActiveProducts();
  const bySlug = new Map(catalogue.map((p) => [p.slug, p]));
  const priceOf = (slug: string, fallback: string) => {
    const p = bySlug.get(slug);
    return p
      ? new Intl.NumberFormat("en-US").format(p.priceSar)
      : fallback;
  };
  /** Direct pay link for a catalogue product (null when it is not on sale). */
  const buyHref = (slug: string) =>
    bySlug.has(slug) ? `/checkout?product=${slug}` : null;

  const stats = [
    { value: "1,200+", label: t("Landing.statStudents") },
    { value: "45", label: t("Landing.statTeachers") },
    { value: "98%", label: t("Landing.statSatisfaction") },
    { value: "60k+", label: t("Landing.statHours") },
  ];

  // ── Where you need English (profile p.2) ──
  const needs: { icon: any; title: string; desc: string }[] = [
    { icon: GraduationCap, title: t("Landing.needUniTitle"), desc: t("Landing.needUniDesc") },
    { icon: Briefcase, title: t("Landing.needJobTitle"), desc: t("Landing.needJobDesc") },
    { icon: FileText, title: t("Landing.needExamTitle"), desc: t("Landing.needExamDesc") },
    { icon: Globe, title: t("Landing.needWorldTitle"), desc: t("Landing.needWorldDesc") },
  ];

  // ── About items (profile p.3) ──
  const aboutItems: { icon: any; title: string; desc: string }[] = [
    { icon: MonitorPlay, title: t("Landing.about1Title"), desc: t("Landing.about1Desc") },
    { icon: UserCheck, title: t("Landing.about2Title"), desc: t("Landing.about2Desc") },
    { icon: BookOpen, title: t("Landing.about3Title"), desc: t("Landing.about3Desc") },
    { icon: MapPin, title: t("Landing.about4Title"), desc: t("Landing.about4Desc") },
  ];

  // ── Programs (profile p.5) ──
  const programs: { icon: any; title: string; desc: string }[] = [
    { icon: BookOpen, title: t("Landing.progTermTitle"), desc: t("Landing.progTermDesc") },
    { icon: FileCheck, title: t("Landing.progExamTitle"), desc: t("Landing.progExamDesc") },
    { icon: Briefcase, title: t("Landing.progCpcTitle"), desc: t("Landing.progCpcDesc") },
    { icon: User, title: t("Landing.progPrivateTitle"), desc: t("Landing.progPrivateDesc") },
    { icon: Building2, title: t("Landing.progCorpTitle"), desc: t("Landing.progCorpDesc") },
    { icon: Gift, title: t("Landing.progFreeTitle"), desc: t("Landing.progFreeDesc") },
  ];

  // ── Why HAJR (profile p.6) ──
  const whys: { icon: any; title: string; desc: string }[] = [
    { icon: Users, title: t("Landing.why1Title"), desc: t("Landing.why1Desc") },
    { icon: BarChart3, title: t("Landing.why2Title"), desc: t("Landing.why2Desc") },
    { icon: ShieldCheck, title: t("Landing.why3Title"), desc: t("Landing.why3Desc") },
    { icon: BadgeCheck, title: t("Landing.why4Title"), desc: t("Landing.why4Desc") },
  ];

  const labPoints: { icon: any; label: string }[] = [
    { icon: Sparkles, label: t("Landing.labPoint1") },
    { icon: Zap, label: t("Landing.labPoint2") },
    { icon: Trophy, label: t("Landing.labPoint3") },
  ];

  // ── How to start / free trial (profile p.9) ──
  const howSteps: { n: string; icon: any; title: string; desc: string }[] = [
    { n: "1", icon: MessageCircle, title: t("Landing.howStep1Title"), desc: t("Landing.howStep1Desc") },
    { n: "2", icon: Compass, title: t("Landing.howStep2Title"), desc: t("Landing.howStep2Desc") },
    { n: "3", icon: Rocket, title: t("Landing.howStep3Title"), desc: t("Landing.howStep3Desc") },
  ];

  // ── Pricing (profile p.7) ──
  const corePlans: { slug: string; label: string; sub: string; price: string; was?: string; unit: string; star?: boolean }[] = [
    { slug: "core-monthly", label: t("Landing.planMonthly"), sub: t("Landing.planMonthlySub"), price: priceOf("core-monthly", "300"), unit: t("Landing.unitPerMonth") },
    { slug: "core-term", label: t("Landing.planTerm"), sub: t("Landing.planTermSub"), price: priceOf("core-term", "1,215"), was: "1,350", unit: t("Landing.unitPerTerm") },
    { slug: "core-yearly", label: t("Landing.planYearly"), sub: t("Landing.planYearlySub"), price: priceOf("core-yearly", "2,106"), was: "2,700", unit: t("Landing.unitPerYear"), star: true },
  ];
  const courses: { slug: string; title: string; desc: string; price: string }[] = [
    { slug: "step-course", title: t("Landing.stepCourseTitle"), desc: t("Landing.stepCourseDesc"), price: priceOf("step-course", "600") },
    { slug: "ielts-toefl-course", title: t("Landing.intlCourseTitle"), desc: t("Landing.intlCourseDesc"), price: priceOf("ielts-toefl-course", "1,200") },
  ];
  const priceChips = [t("Landing.priceChip1"), t("Landing.priceChip2"), t("Landing.priceChip3")];

  // ── Summer intensive (profile p.8) ──
  const summerTracks: {
    title: string; dur: string; badge?: string; featured?: boolean; slugBase: string;
    tiers: { tier: string; per: string; freq: string; month: string; star?: boolean; slug?: string }[];
  }[] = [
    {
      title: t("Landing.trackGroupTitle"), dur: t("Landing.trackGroupDur"), badge: t("Landing.trackGroupBadge"), featured: true, slugBase: "summer-group",
      tiers: [
        { tier: t("Landing.tierStarter"), per: "33", freq: t("Landing.freq1"), month: priceOf("summer-group-starter", "132") },
        { tier: t("Landing.tierGrowth"), per: "30", freq: t("Landing.freq2"), month: priceOf("summer-group-growth", "240"), star: true },
        { tier: t("Landing.tierIntensive"), per: "28", freq: t("Landing.freq3"), month: priceOf("summer-group-intensive", "336") },
      ],
    },
    {
      title: t("Landing.trackIntlTitle"), dur: t("Landing.trackIntlDur"), slugBase: "summer-intl",
      tiers: [
        { tier: t("Landing.tierStarter"), per: "42", freq: t("Landing.freq1"), month: priceOf("summer-intl-starter", "168") },
        { tier: t("Landing.tierGrowth"), per: "38", freq: t("Landing.freq2"), month: priceOf("summer-intl-growth", "304"), star: true },
        { tier: t("Landing.tierIntensive"), per: "35", freq: t("Landing.freq3"), month: priceOf("summer-intl-intensive", "420") },
      ],
    },
    {
      title: t("Landing.trackNativeTitle"), dur: t("Landing.trackNativeDur"), slugBase: "summer-native",
      tiers: [
        { tier: t("Landing.tierStarter"), per: "62", freq: t("Landing.freq1"), month: priceOf("summer-native-starter", "248") },
        { tier: t("Landing.tierGrowth"), per: "58", freq: t("Landing.freq2"), month: priceOf("summer-native-growth", "464"), star: true },
        { tier: t("Landing.tierIntensive"), per: "54", freq: t("Landing.freq3"), month: priceOf("summer-native-intensive", "648") },
      ],
    },
  ];
  const summerChips = [
    t("Landing.summerChip1"), t("Landing.summerChip2"), t("Landing.summerChip3"), t("Landing.summerChip4"),
  ];

  const faqs = Array.from({ length: 8 }, (_, i) => ({
    q: t(`Landing.faqQ${i + 1}` as any),
    a: t(`Landing.faqA${i + 1}` as any),
  }));

  const testimonials = isAr
    ? [
        { quote: "نتائج ولدي تحسنت بشكل ملحوظ خلال فصل واحد. متابعة ممتازة والمعلمون محترفون.", name: "أم محمد", role: "ولية أمر", stars: 5 },
        { quote: "أفضل تجربة تعلم إنجليزي مررت بها. الإعداد لستيب دقيق ومنظّم.", name: "فهد العتيبي", role: "طالب", stars: 5 },
        { quote: "حصلت على 95 في ستيب بفضل التدريب المركّز هنا.", name: "عبدالرحمن", role: "طالب", stars: 5 },
        { quote: "متابعة مستمرة وتقارير شهرية واضحة عن مستوى ابنتي.", name: "نورة", role: "ولية أمر", stars: 5 },
        { quote: "معلمون رائعون ومنصة سهلة، ابنتي تحب الحصص كثيرًا.", name: "سارة الحسن", role: "ولية أمر", stars: 5 },
        { quote: "نقلة حقيقية في تحضيري لاختبار آيلتس. أنصح بها بشدة.", name: "أحمد ك.", role: "طالب", stars: 5 },
      ]
    : [
        { quote: "My son improved dramatically in a single term. Excellent follow-up and professional teachers.", name: "Umm Mohammed", role: "Parent", stars: 5 },
        { quote: "Best English learning experience I've had. STEP prep is structured and precise.", name: "Fahd Al-Otaibi", role: "Student", stars: 5 },
        { quote: "I scored 95 on STEP thanks to the focused training here.", name: "Abdulrahman", role: "Student", stars: 5 },
        { quote: "Continuous follow-up and clear monthly reports on my daughter's progress.", name: "Noura", role: "Parent", stars: 5 },
        { quote: "Excellent teachers and platform, my daughter loves the lessons.", name: "Sarah Al-Hassan", role: "Parent", stars: 5 },
        { quote: "Game changer for my IELTS prep. Highly recommended.", name: "Ahmed K.", role: "Student", stars: 5 },
      ];

  const navLinks = [
    { href: "#need", label: t("Landing.needTitle") },
    { href: "#programs", label: t("Landing.navPrograms") },
    { href: "#packages", label: t("Landing.navPricing") },
    { href: "#about", label: t("Landing.navAbout") },
    { href: "#contact", label: t("Landing.navContact") },
  ];

  return (
    <div className="min-h-screen bg-hajr-ivory">
      <AnnouncementBar
        message={
          isAr
            ? "التسجيل المبكر 2026 مفتوح — خصم يصل إلى 24% حتى 23 أغسطس"
            : "Early registration 2026 is open — save up to 24% until 23 August"
        }
        dismissLabel={t("Landing.announcementDismiss")}
        href={`/${locale}/early-registration`}
        ctaLabel={isAr ? "اعرف التفاصيل" : "See the offer"}
      />

      {/* ── Top nav ───────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-hajr-border/70 bg-hajr-ivory/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-2">
          <HajrLogo size="sm" variant="full" />
          <nav className="hidden items-center gap-7 lg:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-hajr-body transition-colors hover:text-hajr-deep-navy">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <LanguageToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">{t("Landing.ctaLogin")}</Link>
            </Button>
            <Button variant="cta" size="lg" className="px-5 sm:px-6" asChild>
              <a href={trialHref}>{t("Landing.ctaBookTrial")}</a>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero — Deep Navy ──────────────────────────────── */}
      <section className="relative overflow-hidden bg-hajr-deep-navy">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(58rem 30rem at 50% -12%, rgba(255,255,255,0.06), transparent 70%)" }} />
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
              <a href={trialHref} className="gap-2">
                {t("Landing.ctaTrialFree")}
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </a>
            </Button>
            <Button size="lg" asChild className="border border-white/25 bg-transparent text-white hover:bg-white/10">
              <a href="#programs">{t("Landing.navPrograms")}</a>
            </Button>
          </div>
          <div className="animate-fade-in-up mt-12 flex flex-wrap items-center justify-center gap-3 [animation-delay:400ms]">
            <FeatureChip icon={Calendar} label={t("Landing.featureFlex")} />
            <FeatureChip icon={Users} label={t("Landing.featureCert")} />
            <FeatureChip icon={Award} label={t("Landing.featurePractical")} />
            <FeatureChip icon={ClipboardCheck} label={t("Landing.featureMock")} />
          </div>
        </div>
      </section>

      {/* ── Stats band ────────────────────────────────────── */}
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

      {/* ── Where you need English (profile p.2) ──────────── */}
      <section id="need" className="container py-20 sm:py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <SectionEyebrow center>{t("Landing.needEyebrow")}</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.needTitle")}</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {needs.map((n) => {
            const Icon = n.icon;
            return (
              <Card key={n.title} className="p-6 text-center">
                <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-hajr-mint/50 text-hajr-deep-navy ring-1 ring-hajr-rose/30">
                  <Icon className="h-7 w-7" />
                </span>
                <h3 className="text-lg font-semibold text-hajr-deep-navy">{n.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-hajr-muted">{n.desc}</p>
              </Card>
            );
          })}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-base leading-relaxed text-hajr-body">{t("Landing.needFooter")}</p>
      </section>

      {/* ── About (من نحن) — profile p.3 ──────────────────── */}
      <section id="about" className="bg-white py-20 sm:py-24">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <SectionEyebrow center>{t("Landing.aboutEyebrow")}</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.aboutTitle")}</h2>
            <p className="mt-4 text-lg leading-relaxed text-hajr-body">{t("Landing.aboutBody")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {aboutItems.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.title} className="flex items-start gap-4 rounded-card border border-hajr-border bg-hajr-ivory/50 p-6">
                  <span className="icon-chip h-11 w-11 shrink-0"><Icon className="h-5 w-5" /></span>
                  <div>
                    <h3 className="font-semibold text-hajr-deep-navy">{a.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-hajr-muted">{a.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Mission + Vision (profile p.4) ────────────────── */}
      <section className="container py-20 sm:py-24">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <Card className="relative overflow-hidden p-8">
            <span className="absolute inset-y-0 start-0 w-1 bg-hajr-rose" />
            <SectionEyebrow>{t("Landing.missionTitle")}</SectionEyebrow>
            <p className="mt-4 text-xl font-medium leading-relaxed text-hajr-deep-navy">{t("Landing.missionBody")}</p>
          </Card>
          <Card className="relative overflow-hidden p-8">
            <span className="absolute inset-y-0 start-0 w-1 bg-hajr-deep-navy" />
            <SectionEyebrow>{t("Landing.visionTitle")}</SectionEyebrow>
            <p className="mt-4 text-xl font-medium leading-relaxed text-hajr-deep-navy">{t("Landing.visionBody")}</p>
          </Card>
        </div>
      </section>

      {/* ── Programs (ماذا نقدم) — profile p.5 ────────────── */}
      <section id="programs" className="bg-white py-20 sm:py-24">
        <div className="container">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <SectionEyebrow center>{t("Landing.servicesEyebrow")}</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.servicesTitle")}</h2>
            <p className="mt-3 text-hajr-muted">{t("Landing.servicesSubtitle")}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => {
              const Icon = p.icon;
              return (
                <Card key={p.title} className="group relative overflow-hidden p-6">
                  <span className="absolute inset-x-0 top-0 h-1 bg-hajr-deep-navy" />
                  <div className="icon-chip mb-4 h-14 w-14 rounded-2xl"><Icon className="h-7 w-7" /></div>
                  <h3 className="text-lg font-semibold text-hajr-deep-navy">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-hajr-muted">{p.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why HAJR (ليش هجر) — profile p.6 ──────────────── */}
      <section className="container py-20 sm:py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <SectionEyebrow center>{t("Landing.valuesEyebrow")}</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.valuesTitle")}</h2>
          <p className="mt-3 text-hajr-muted">{t("Landing.valuesSubtitle")}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {whys.map((v, i) => {
            const Icon = v.icon;
            return (
              <Card key={v.title} className="relative p-6">
                <span className="num absolute end-5 top-5 text-2xl font-bold text-hajr-border">{i + 1}</span>
                <div className="icon-chip mb-4 h-12 w-12"><Icon className="h-6 w-6" /></div>
                <h3 className="text-lg font-semibold text-hajr-deep-navy">{v.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-hajr-muted">{v.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── English Lab spotlight (owned platform) ────────── */}
      <section className="relative overflow-hidden bg-hajr-deep-navy py-20 sm:py-24">
        <AoWatermark />
        <div className="container relative grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <SectionEyebrow light>{t("Landing.labEyebrow")}</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{t("Landing.labTitle")}</h2>
            <p className="mt-5 text-lg leading-relaxed text-white/70">{t("Landing.labBody")}</p>
            <div className="mt-8">
              <Button variant="cta" size="lg" asChild>
                <a href={trialHref} className="gap-2">
                  {t("Landing.ctaTrialFree")}
                  <ArrowRight className="h-4 w-4 rtl-flip" />
                </a>
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            {labPoints.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.label} className="flex items-center gap-4 rounded-card border border-white/10 bg-white/[0.04] p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-hajr-mint"><Icon className="h-5 w-5" /></span>
                  <span className="text-base font-medium text-white">{p.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Teachers ──────────────────────────────────────── */}
      <section id="teachers" className="container py-20 sm:py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <SectionEyebrow center>{t("Landing.teachersEyebrow")}</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.teachersTitle")}</h2>
          <p className="mt-3 text-hajr-muted">{t("Landing.teachersSubtitle")}</p>
        </div>
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[GraduationCap, BookOpen, Users, BadgeCheck].map((Icon, i) => (
            <div key={i} className="rounded-card border border-hajr-border bg-white p-6 text-center shadow-card">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-hajr-deep-navy text-white"><Icon className="h-6 w-6" /></span>
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
      </section>

      {/* ── How to start / free trial (profile p.9) ───────── */}
      <section className="bg-white py-20 sm:py-24">
        <div className="container">
          <div className="mx-auto mb-6 max-w-2xl text-center">
            <SectionEyebrow center>{t("Landing.howTitle")}</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.howSubtitle")}</h2>
          </div>
          <p className="mx-auto mb-12 max-w-xl rounded-card bg-hajr-mint/40 px-5 py-3 text-center text-sm font-medium text-hajr-deep-navy">
            {t("Landing.trialNote")}
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {howSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.n} className="rounded-card border border-hajr-border bg-hajr-ivory/60 p-7 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-hajr-deep-navy text-white"><Icon className="h-6 w-6" /></div>
                  <div className="num mt-4 text-xs font-semibold tracking-widest text-hajr-rose">{step.n} / 3</div>
                  <h3 className="mt-1 text-lg font-semibold text-hajr-deep-navy">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-hajr-muted">{step.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <Button variant="cta" size="lg" asChild>
              <a href={trialHref} className="gap-2">
                {t("Landing.ctaTrialFree")}
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Pricing (profile p.7) ─────────────────────────── */}
      <section id="packages" className="container py-20 sm:py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <SectionEyebrow center>{t("Landing.packagesEyebrow")}</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.packagesTitle")}</h2>
          <p className="mt-3 text-hajr-muted">{t("Landing.packagesSubtitle")}</p>
        </div>
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3 lg:items-start">
          {/* Core program — featured navy card with 3 plans */}
          <div className="relative overflow-hidden rounded-card bg-hajr-deep-navy p-7 text-white shadow-card-hover lg:order-3">
            <div className="absolute -top-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
              <span className="inline-flex items-center rounded-full bg-hajr-rose px-3 py-1 text-xs font-semibold text-white shadow-sm">
                <Star className="me-1 h-3 w-3 fill-current" />{t("Landing.coreBadge")}
              </span>
            </div>
            <div className="pt-4 text-center">
              <h3 className="text-lg font-semibold text-white">{t("Landing.coreTitle")}</h3>
              <p className="mt-2 text-xs leading-relaxed text-white/60">{t("Landing.coreDesc")}</p>
            </div>
            <div className="mt-6 space-y-3">
              {corePlans.map((p) => (
                <div key={p.label} className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${p.star ? "border-hajr-rose/60 bg-white/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                      {p.label}{p.star && <Star className="h-3 w-3 fill-hajr-rose text-hajr-rose" />}
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/55">{p.sub}</div>
                  </div>
                  <div className="text-end">
                    <div className="flex items-baseline gap-1">
                      <span className="num text-2xl font-semibold text-white">{p.price}</span>
                      {p.was && <span className="num text-xs text-white/40 line-through">{p.was}</span>}
                    </div>
                    <div className="text-[10px] text-white/50">{p.unit}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              {corePlans.map((p) => {
                const href = buyHref(p.slug);
                return href ? (
                  <Button key={p.slug} asChild className="w-full bg-white text-hajr-deep-navy hover:bg-white/90">
                    <Link href={href}>{t("Landing.ctaSubscribeNow")} — {p.label}</Link>
                  </Button>
                ) : null;
              })}
              <a
                href={waPlan(t("Landing.coreTitle"))}
                target="_blank"
                rel="noopener noreferrer"
                className="block pt-1 text-center text-xs text-white/60 underline underline-offset-4 transition-colors hover:text-white"
              >
                {t("Landing.ctaOrWhatsApp")}
              </a>
            </div>
          </div>

          {/* Two course cards */}
          {courses.map((c, i) => (
            <Card key={c.title} className={`flex flex-col p-7 text-center ${i === 0 ? "lg:order-2" : "lg:order-1"}`}>
              <h3 className="text-lg font-semibold text-hajr-deep-navy">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-hajr-muted">{c.desc}</p>
              <div className="mt-6 flex items-baseline justify-center gap-1.5">
                <span className="num text-5xl font-semibold text-hajr-deep-navy">{c.price}</span>
              </div>
              <div className="text-sm text-hajr-muted">{t("Landing.unitPerCourse")}</div>
              <div className="mt-7 space-y-2">
                {buyHref(c.slug) ? (
                  <Button asChild variant="cta" className="w-full">
                    <Link href={buyHref(c.slug)!}>{t("Landing.ctaSubscribeNow")}</Link>
                  </Button>
                ) : (
                  <Button asChild variant="default" className="w-full">
                    <a href={waPlan(c.title)} target="_blank" rel="noopener noreferrer">{t("Landing.ctaChoosePlan")}</a>
                  </Button>
                )}
                <a
                  href={waPlan(c.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs text-hajr-muted underline underline-offset-4 transition-colors hover:text-hajr-deep-navy"
                >
                  {t("Landing.ctaOrWhatsApp")}
                </a>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {priceChips.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-hajr-border bg-white px-4 py-2 text-xs font-medium text-hajr-body">
              <Check className="h-3.5 w-3.5 text-hajr-rose" />{c}
            </span>
          ))}
        </div>
      </section>

      {/* ── Summer intensive (profile p.8) ────────────────── */}
      <section className="bg-white py-20 sm:py-24">
        <div className="container">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <SectionEyebrow center>{t("Landing.summerEyebrow")}</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.summerTitle")}</h2>
            <p className="mt-3 text-hajr-muted">{t("Landing.summerSubtitle")}</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
            {summerTracks.map((tr) => (
              <div
                key={tr.title}
                className={`relative flex flex-col rounded-card border p-6 ${tr.featured ? "border-hajr-rose/50 bg-hajr-ivory/60 shadow-card-hover" : "border-hajr-border bg-white shadow-card"}`}
              >
                {tr.badge && (
                  <div className="absolute -top-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-hajr-rose px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      <Star className="me-1 h-3 w-3 fill-current" />{tr.badge}
                    </span>
                  </div>
                )}
                <div className="pt-3 text-center">
                  <h3 className="text-lg font-semibold text-hajr-deep-navy">{tr.title}</h3>
                  <p className="mt-1 text-xs text-hajr-muted">{tr.dur}</p>
                </div>
                <div className="mt-5 space-y-2.5">
                  {tr.tiers.map((ti) => (
                    <div key={ti.tier} className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 ${ti.star ? "border-hajr-rose/40 bg-white" : "border-hajr-border bg-white"}`}>
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-hajr-deep-navy">
                          {ti.tier}{ti.star && <Star className="h-3 w-3 fill-hajr-rose text-hajr-rose" />}
                        </div>
                        <div className="mt-0.5 text-[11px] text-hajr-muted">{ti.freq}</div>
                      </div>
                      <div className="text-end">
                        <div className="num text-base font-semibold text-hajr-deep-navy">{ti.per} <span className="text-[10px] font-normal text-hajr-muted">{t("Landing.unitPerLesson")}</span></div>
                        <div className="text-[11px] text-hajr-muted"><span className="num">{ti.month}</span> {t("Landing.unitMonthly")}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 space-y-2">
                  {tr.tiers.map((ti, ix) => {
                    const slug = `${tr.slugBase}-${["starter", "growth", "intensive"][ix] ?? ix}`;
                    const href = buyHref(slug);
                    return href ? (
                      <Button key={slug} asChild variant={tr.featured ? "cta" : "default"} className="w-full">
                        <Link href={href}>{t("Landing.ctaSubscribeNow")} — {ti.tier}</Link>
                      </Button>
                    ) : null;
                  })}
                  <a
                    href={waPlan(tr.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block pt-1 text-center text-xs text-hajr-muted underline underline-offset-4 transition-colors hover:text-hajr-deep-navy"
                  >
                    {t("Landing.ctaOrWhatsApp")}
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {summerChips.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-hajr-border bg-hajr-ivory/60 px-4 py-2 text-xs font-medium text-hajr-body">
                <Check className="h-3.5 w-3.5 text-hajr-rose" />{c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust ─────────────────────────────────────────── */}
      <section className="container py-20 sm:py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <SectionEyebrow center>{t("Landing.trustTitle")}</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.trustTitle")}</h2>
          <p className="mt-3 text-hajr-muted">{t("Landing.trustSubtitle")}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BadgeCheck, title: t("Landing.trustCertTitle"), desc: t("Landing.trustCertDesc") },
            { icon: Lock, title: t("Landing.trustSecureTitle"), desc: t("Landing.trustSecureDesc") },
            { icon: ReceiptText, title: t("Landing.trustZatcaTitle"), desc: t("Landing.trustZatcaDesc") },
            { icon: BarChart3, title: t("Landing.trustReportsTitle"), desc: t("Landing.trustReportsDesc") },
          ].map((tr) => {
            const Icon = tr.icon;
            return (
              <Card key={tr.title} className="p-6 text-center">
                <div className="icon-chip mx-auto mb-4 h-12 w-12"><Icon className="h-6 w-6" /></div>
                <h3 className="text-base font-semibold text-hajr-deep-navy">{tr.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-hajr-muted">{tr.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-24">
        <div className="container">
          <div className="mx-auto mb-3 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hajr-border bg-white px-3 py-1 text-xs font-medium text-hajr-deep-navy shadow-card">
              <VerifyIcon className="h-3.5 w-3.5" />{t("Landing.trustBadge")}
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
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-hajr-deep-navy text-sm font-semibold text-white shadow-sm">{tm.name.charAt(0)}</span>
                  <div>
                    <div className="text-sm font-semibold text-hajr-deep-navy">{tm.name}</div>
                    <div className="text-xs text-hajr-muted">{tm.role}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className="container py-20 sm:py-24">
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
      </section>

      {/* ── Contact ───────────────────────────────────────── */}
      <section id="contact" className="bg-white py-20 sm:py-24">
        <div className="container">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-semibold text-hajr-deep-navy sm:text-4xl">{t("Landing.contactTitle")}</h2>
              <p className="mt-3 leading-relaxed text-hajr-muted">{t("Landing.contactSubtitle")}</p>
              <div className="mt-8 space-y-4">
                <a href={trialHref} className="block">
                  <ContactRow icon={Phone} label={t("Landing.contactPhoneLabel")} value="+966 50 245 6651" />
                </a>
                <ContactRow icon={Mail} label={t("Landing.contactEmailLabel")} value="hello@hajracademy.com" />
                <ContactRow icon={MapPin} label={t("Landing.contactAddressLabel")} value={t("Landing.contactAddressValue")} />
              </div>
            </div>
            <Card className="p-6 sm:p-8">
              <ContactForm />
            </Card>
          </div>
        </div>
      </section>

      {/* ── Final CTA — Deep Navy (profile p.10) ──────────── */}
      <section className="container py-20">
        <div className="relative overflow-hidden rounded-card bg-hajr-deep-navy px-8 py-14 text-center shadow-card sm:px-16">
          <AoWatermark />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold text-white sm:text-4xl">{t("Landing.ctaSectionTitle")}</h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">{t("Landing.ctaSectionSubtitle")}</p>
            <Button variant="cta" size="lg" asChild className="mt-8">
              <a href={trialHref} className="gap-2">
                {t("Landing.ctaTrialFree")}
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </a>
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
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">{t("Landing.footerTagline")}</p>
            </div>
            <FooterCol title={t("Landing.footerProductsTitle")}>
              <FooterLink href="#programs">{t("Landing.progTermTitle")}</FooterLink>
              <FooterLink href="#programs">{t("Landing.progExamTitle")}</FooterLink>
              <FooterLink href="#programs">{t("Landing.progPrivateTitle")}</FooterLink>
              <FooterLink href="#packages">{t("Landing.navPricing")}</FooterLink>
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
function GatewayLines() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 start-6 hidden sm:block">
      <div className="absolute inset-y-0 start-0 w-px bg-white/10" />
      <div className="absolute inset-y-0 start-3 w-px bg-white/[0.06]" />
    </div>
  );
}

function AoWatermark() {
  return (
    <span aria-hidden dir="ltr" className="pointer-events-none absolute -bottom-10 end-6 select-none font-en text-[12rem] font-light leading-none text-white/[0.04] sm:text-[16rem]">
      A°
    </span>
  );
}

/* ── small presentational helpers ───────────────────────── */
function SectionEyebrow({ children, center, light }: { children: React.ReactNode; center?: boolean; light?: boolean }) {
  return (
    <div className={center ? "flex justify-center" : ""}>
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${light ? "border-white/20 bg-white/5 text-hajr-mint" : "border-hajr-border bg-white text-hajr-rose"}`}>
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

function ContactRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="icon-chip shrink-0"><Icon className="h-5 w-5" /></span>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-hajr-light">{label}</div>
        <div className="num text-sm font-semibold text-hajr-deep-navy" dir="ltr">{value}</div>
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
      {isInternalPath ? <Link href={href} className={cls}>{children}</Link> : <a href={href} className={cls}>{children}</a>}
    </li>
  );
}

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
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] text-white/70 transition-colors hover:bg-white/15 hover:text-white">
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </li>
  );
}
