import { Link } from "@/i18n/routing";
import { getTranslations, getLocale } from "next-intl/server";
import { HajrLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ChatBubble from "@/components/public/ChatBubble";
import { ContactForm } from "./contact-form";
import { AnnouncementBar } from "@/components/public/AnnouncementBar";
import { WhatsAppFab } from "@/components/public/WhatsAppFab";
import { MobileStickyCta } from "@/components/public/MobileStickyCta";
import {
  GraduationCap, BookOpen, School, FlaskConical,
  Calendar, ClipboardCheck, Users, Award, Check, ArrowRight, Star, Quote,
  Target, TrendingUp, HeartHandshake, ShieldCheck, Mail, Phone, MapPin,
  Twitter, Instagram, MessageCircle, Music2, Ghost, ShieldCheck as VerifyIcon,
} from "lucide-react";

export default async function LandingPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const isAr = locale === "ar";

  const programs: { code: string; icon: any; duration: string }[] = [
    { code: "STEP_PREP", icon: ClipboardCheck, duration: "16h" },
    { code: "PRIVATE", icon: BookOpen, duration: "16h" },
    { code: "UNI_PREP", icon: GraduationCap, duration: "16h" },
    { code: "SCHOOL", icon: School, duration: "12m" },
    { code: "ENGLISH_LAB", icon: FlaskConical, duration: "∞" },
  ];

  const packages: {
    code: string; price: number; sessions: number; lab: boolean; featured: boolean;
  }[] = [
    { code: "ESSENTIAL", price: 250, sessions: 8, lab: false, featured: false },
    { code: "INTEGRATED", price: 300, sessions: 12, lab: true, featured: true },
    { code: "PRIVATE", price: 800, sessions: 16, lab: true, featured: false },
    { code: "STEP_PREP_PKG", price: 600, sessions: 16, lab: true, featured: false },
    { code: "IELTS_PREP_PKG", price: 800, sessions: 16, lab: true, featured: false },
  ];

  const stats = [
    { value: "1,200+", label: t("Landing.statStudents") },
    { value: "45", label: t("Landing.statTeachers") },
    { value: "98%", label: t("Landing.statSatisfaction") },
    { value: "60k+", label: t("Landing.statHours") },
  ];

  const values: { icon: any; title: string; desc: string }[] = [
    { icon: Target, title: t("Landing.valueAchievementTitle"), desc: t("Landing.valueAchievementDesc") },
    { icon: TrendingUp, title: t("Landing.valueGrowthTitle"), desc: t("Landing.valueGrowthDesc") },
    { icon: HeartHandshake, title: t("Landing.valueCommunityTitle"), desc: t("Landing.valueCommunityDesc") },
    { icon: ShieldCheck, title: t("Landing.valueConfidenceTitle"), desc: t("Landing.valueConfidenceDesc") },
  ];

  // 6 testimonials with avatar gradients. Admin can later swap to real photos via DB.
  const AVATAR_GRADIENTS = [
    "from-hajr-deep-navy to-hajr-navy",
    "from-hajr-rose to-pink-400",
    "from-emerald-500 to-emerald-700",
    "from-amber-500 to-orange-500",
    "from-blue-600 to-indigo-700",
    "from-slate-500 to-slate-700",
  ];
  const testimonials = isAr
    ? [
        { quote: "نتائج ولدي تحسنت بشكل ملحوظ خلال فصل واحد. متابعة ممتازة والمدربون محترفون.", name: "أم محمد",       role: "ولية أمر", stars: 5 },
        { quote: "أفضل تجربة تعلم انجليزي مررت بها. الإعداد لستيب دقيق ومنظّم.",                 name: "فهد العتيبي",   role: "طالب",    stars: 5 },
        { quote: "حصلت على 95 في ستيب بفضل التدريب المركّز هنا.",                                name: "عبدالرحمن",    role: "طالب",    stars: 5 },
        { quote: "متابعة مستمرة وتقارير شهرية واضحة عن مستوى ابنتي.",                            name: "نورة",          role: "ولية أمر", stars: 5 },
        { quote: "Excellent teachers and platform — my daughter loves the lessons.",            name: "Sarah Al-Hassan", role: "Parent",  stars: 5 },
        { quote: "Game changer for my IELTS prep. Highly recommended.",                          name: "Ahmed K.",       role: "Student", stars: 5 },
      ]
    : [
        { quote: "My son improved dramatically in a single term. Excellent follow-up and professional instructors.", name: "Umm Mohammed",   role: "Parent",  stars: 5 },
        { quote: "Best English learning experience I've had. STEP prep is structured and precise.",                  name: "Fahd Al-Otaibi", role: "Student", stars: 5 },
        { quote: "I scored 95 on STEP thanks to the focused training here.",                                         name: "Abdulrahman",    role: "Student", stars: 5 },
        { quote: "Continuous follow-up and clear monthly reports on my daughter's progress.",                        name: "Noura",          role: "Parent",  stars: 5 },
        { quote: "Excellent teachers and platform — my daughter loves the lessons.",                                 name: "Sarah Al-Hassan", role: "Parent", stars: 5 },
        { quote: "Game changer for my IELTS prep. Highly recommended.",                                              name: "Ahmed K.",       role: "Student", stars: 5 },
      ];

  return (
    <div className="min-h-screen bg-hajr-ivory">
      {/* ── Announcement bar ─────────────────────────────── */}
      <AnnouncementBar
        message={t("Landing.announcementBar")}
        dismissLabel={t("Landing.announcementDismiss")}
      />
      {/* ── Top nav ───────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-hajr-border/70 bg-hajr-ivory/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-2">
          <HajrLogo size="sm" variant="full" />
          <div className="flex items-center gap-2">
            <LanguageToggle />
            {/* Sign-in: visible on every breakpoint, condensed on mobile */}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">{t("Landing.ctaLogin")}</Link>
            </Button>
            {/* Primary CTA — always visible */}
            <Button variant="cta" size="pill" asChild>
              <Link href="/register">{t("Landing.ctaStickyMobile")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero — deep navy ──────────────────────────────── */}
      <section className="relative overflow-hidden bg-hajr-deep-navy">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(58rem 30rem at 50% -12%, rgba(255,255,255,0.06), transparent 70%), radial-gradient(34rem 20rem at 88% 8%, rgba(201,123,138,0.16), transparent 70%)",
          }}
        />
        <div className="container relative flex flex-col items-center py-20 text-center sm:py-28">
          <div className="animate-fade-in">
            <span className="mb-6 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              {t("Landing.heroEyebrow")}
            </span>
          </div>
          <div className="animate-fade-in-up [animation-delay:80ms]">
            <HajrLogo size="lg" variant="full" light className="mb-8 items-center" />
          </div>
          <h1 className="animate-fade-in-up max-w-3xl text-4xl font-extrabold leading-[1.15] tracking-tight text-white [animation-delay:160ms] sm:text-5xl">
            {t("Landing.heroTitle")}
          </h1>
          <p className="animate-fade-in-up mt-5 max-w-xl text-lg leading-relaxed text-white/65 [animation-delay:240ms]">
            {t("Landing.heroSubtitleLong")}
          </p>
          <div className="animate-fade-in-up mt-9 flex flex-wrap items-center justify-center gap-3 [animation-delay:320ms]">
            <Button variant="cta" size="pill" asChild>
              <Link href="/register" className="gap-2">
                {t("Landing.ctaEnrollFree")}
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </Link>
            </Button>
            <Button
              size="pill"
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

      {/* ── Stats band ────────────────────────────────────── */}
      <section className="border-b border-hajr-border bg-white">
        <div className="container grid grid-cols-2 gap-8 py-10 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="num text-3xl font-extrabold text-hajr-navy sm:text-4xl">{s.value}</div>
              <div className="mt-1 text-sm text-hajr-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Brand values ──────────────────────────────────── */}
      <section className="container py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-hajr-navy sm:text-4xl">{t("Landing.valuesTitle")}</h2>
          <p className="mt-3 text-hajr-muted">{t("Landing.valuesSubtitle")}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className="rounded-2xl border border-hajr-border bg-hajr-ivory p-6 transition-shadow duration-200 hover:shadow-card"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-hajr-deep-navy">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-hajr-navy">{v.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-hajr-muted">{v.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Programs ──────────────────────────────────────── */}
      <section id="programs" className="bg-white py-20">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-hajr-navy sm:text-4xl">{t("Landing.programsTitle")}</h2>
            <p className="mt-3 text-hajr-muted">{t("Landing.programsSubtitle")}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => {
              const Icon = p.icon;
              return (
                <Card key={p.code} className="group relative overflow-hidden">
                  <span className="absolute inset-x-0 top-0 h-1 bg-hajr-deep-navy" />
                  <CardHeader>
                    <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-hajr-surface">
                      <Icon className="h-7 w-7 text-hajr-navy" />
                    </div>
                    <CardTitle className="text-xl text-hajr-navy">{t("Programs." + p.code as any)}</CardTitle>
                    <CardDescription className="mt-1 inline-flex items-center gap-1.5 text-hajr-muted">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="num">{p.duration}</span>
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Packages ──────────────────────────────────────── */}
      <section className="container py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-hajr-navy sm:text-4xl">{t("Landing.packagesTitle")}</h2>
          <p className="mt-3 text-hajr-muted">{t("Landing.packagesSubtitle")}</p>
        </div>
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3 md:items-center">
          {packages.map((pk) => (
            <Card
              key={pk.code}
              className={
                pk.featured
                  ? "relative border-hajr-deep-navy ring-1 ring-hajr-deep-navy shadow-card-hover md:scale-105"
                  : "relative"
              }
            >
              {pk.featured && (
                <div className="absolute -top-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
                  <Badge variant="navy" className="px-3 py-1 shadow-sm">
                    <Star className="me-1 h-3 w-3 fill-current" />
                    {t("Landing.packageMostPopular")}
                  </Badge>
                </div>
              )}
              <CardHeader className="pt-8 text-center">
                <CardTitle className="text-lg text-hajr-navy">{t("Packages." + pk.code as any)}</CardTitle>
                <div className="mt-4 flex items-baseline justify-center gap-1.5">
                  <span className="num text-5xl font-extrabold text-hajr-navy">{pk.price}</span>
                  <span className="text-sm text-hajr-muted">{t("Landing.sarPerMonth")}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-hajr-body">
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
                  <Link href={`/checkout?package=${pk.code}`}>{t("Landing.ctaJoin")}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="container">
          <div className="mx-auto mb-3 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-hajr-mint/40 px-3 py-1 text-xs font-medium text-hajr-deep-navy">
              <VerifyIcon className="h-3.5 w-3.5" />
              {t("Landing.trustBadge")}
            </span>
          </div>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-hajr-navy sm:text-4xl">{t("Landing.testimonialsTitle")}</h2>
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
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} text-sm font-semibold text-white shadow-sm`}
                  >
                    {tm.name.charAt(0)}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-hajr-navy">{tm.name}</div>
                    <div className="text-xs text-hajr-muted">{tm.role}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ───────────────────────────────────────── */}
      <section id="contact" className="container py-20">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-bold text-hajr-navy sm:text-4xl">{t("Landing.contactTitle")}</h2>
            <p className="mt-3 leading-relaxed text-hajr-muted">{t("Landing.contactSubtitle")}</p>
            <div className="mt-8 space-y-4">
              <ContactRow icon={Mail} label={t("Landing.contactEmailLabel")} value="hello@hajr.academy" />
              <ContactRow icon={Phone} label={t("Landing.contactPhoneLabel")} value="+966 11 000 0000" />
              <ContactRow icon={MapPin} label={t("Landing.contactAddressLabel")} value={t("Landing.contactAddressValue")} />
            </div>
          </div>
          <Card className="p-6 sm:p-8">
            <ContactForm />
          </Card>
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────────── */}
      <section className="container pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-hajr-deep-navy px-8 py-14 text-center sm:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(30rem 16rem at 15% 20%, rgba(201,123,138,0.22), transparent 70%), radial-gradient(26rem 14rem at 90% 90%, rgba(255,255,255,0.05), transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold text-white sm:text-4xl">
              {t("Landing.ctaSectionTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/65">{t("Landing.ctaSectionSubtitle")}</p>
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
              <FooterLink href="#programs">{t("Programs.STEP_PREP")}</FooterLink>
              <FooterLink href="#programs">{t("Programs.UNI_PREP")}</FooterLink>
              <FooterLink href="#programs">{t("Programs.ENGLISH_LAB")}</FooterLink>
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
              <FooterLink href="/register">{t("Landing.ctaJoin")}</FooterLink>
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

// Social handles the academy is active on. Add a `href` to make an icon a real
// link; entries without one render as non-interactive placeholders (never dead
// "#" links that scroll-to-top). Owner can fill these in as accounts go live.
const SOCIAL_LINKS: { Icon: any; label: string; href?: string }[] = [
  { Icon: Twitter,       label: "Twitter / X" },
  { Icon: Instagram,     label: "Instagram" },
  { Icon: MessageCircle, label: "WhatsApp" },
  { Icon: Music2,        label: "TikTok" },
  { Icon: Ghost,         label: "Snapchat" },
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

/* ── small presentational helpers ───────────────────────── */
function FeatureChip({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2">
      <Icon className="h-4 w-4 text-hajr-rose" />
      <span className="text-sm font-medium text-white">{label}</span>
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

function ContactRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-hajr-surface">
        <Icon className="h-5 w-5 text-hajr-navy" />
      </span>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-hajr-light">{label}</div>
        <div className="text-sm font-semibold text-hajr-navy">{value}</div>
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
  // In-page hash anchors (#programs) and external links must not be locale-
  // prefixed — render them with a plain <a>. Only real internal paths use the
  // locale-aware Link so /en stays /en and /ar stays /ar.
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
