import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, BookOpen, School, FlaskConical, Headphones,
  Calendar, ClipboardCheck, Users, Award, Check,
} from "lucide-react";

export default async function LandingPage() {
  const t = await getTranslations();

  const programs = [
    { code: "STEP_PREP", icon: FileIcon, color: "lavender", duration: "16h" },
    { code: "PRIVATE", icon: BookOpen, color: "mint", duration: "16h" },
    { code: "UNI_PREP", icon: GraduationCap, color: "lavender", duration: "16h" },
    { code: "SCHOOL", icon: School, color: "mint", duration: "12m" },
    { code: "ENGLISH_LAB", icon: FlaskConical, color: "rose", duration: "∞" },
  ] as const;

  const packages = [
    { code: "ESSENTIAL", price: 250, sessions: 8, lab: false, color: "lavender" },
    { code: "INTEGRATED", price: 300, sessions: 12, lab: true, color: "mint" },
    { code: "PRIVATE", price: 800, sessions: 16, lab: true, color: "rose" },
  ];

  return (
    <div className="min-h-screen bg-brand-ivory">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-brand-ivory/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button variant="ghost" asChild><Link href="/login">{t("Landing.ctaLogin")}</Link></Button>
            <Button variant="cta" asChild><Link href="/register">{t("Landing.ctaJoin")}</Link></Button>
          </div>
        </div>
      </header>

      <section className="container py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge variant="info" className="mb-4">{t("Brand.name")}</Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-brand-navy sm:text-5xl lg:text-6xl">
              {t("Landing.heroTitle")}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{t("Landing.heroSubtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="cta" size="lg" asChild><Link href="/register">{t("Landing.ctaJoin")}</Link></Button>
              <Button variant="outline" size="lg" asChild><Link href="#programs">{t("Common.viewAll")}</Link></Button>
            </div>
          </div>
          <div className="rounded-3xl bg-brand-lavender/40 p-10 lg:p-14">
            <div className="flex flex-col items-center justify-center gap-6">
              <div className="grid grid-cols-2 gap-4">
                <FeatureChip icon={Calendar} label={t("Landing.featureFlex")} />
                <FeatureChip icon={Users} label={t("Landing.featureCert")} />
                <FeatureChip icon={Award} label={t("Landing.featurePractical")} />
                <FeatureChip icon={ClipboardCheck} label={t("Landing.featureMock")} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="programs" className="container py-12">
        <h2 className="mb-8 text-3xl font-bold text-brand-navy">{t("Landing.programsTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => {
            const Icon = p.icon;
            return (
              <Card key={p.code}>
                <CardHeader>
                  <div className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-${p.color}/40`}>
                    <Icon className="h-6 w-6 text-brand-navy" />
                  </div>
                  <CardTitle>{t("Programs." + p.code as any)}</CardTitle>
                  <CardDescription>{p.duration}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="container py-12">
        <h2 className="mb-8 text-3xl font-bold text-brand-navy">{t("Landing.packagesTitle")}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {packages.map((pk) => (
            <Card key={pk.code} className={pk.code === "INTEGRATED" ? "ring-2 ring-brand-rose" : ""}>
              <CardHeader>
                <CardTitle>{t("Packages." + pk.code as any)}</CardTitle>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-brand-navy num">{pk.price}</span>
                  <span className="text-sm text-muted-foreground">{t("Landing.sarPerMonth")}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-brand-mint" /> <span className="num">{pk.sessions}</span> sessions</li>
                  {pk.lab && <li className="flex items-center gap-2"><Check className="h-4 w-4 text-brand-mint" /> English Lab</li>}
                </ul>
                <Button asChild variant={pk.code === "INTEGRATED" ? "cta" : "default"} className="mt-6 w-full">
                  <Link href="/register">{t("Landing.ctaJoin")}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="container border-t border-gray-200 py-8 text-center text-sm text-muted-foreground">
        © <span className="num">2026</span> {t("Brand.fullName")}. {t("Landing.footerRights")}
      </footer>
    </div>
  );
}

function FeatureChip({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
      <Icon className="h-4 w-4 text-brand-rose" />
      <span className="text-sm font-medium text-brand-navy">{label}</span>
    </div>
  );
}

function FileIcon({ className }: { className?: string }) {
  return <Headphones className={className} />;
}
