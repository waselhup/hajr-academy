import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HajrLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { ContactForm } from "../contact-form";
import { Mail, Phone, MapPin, ArrowLeft } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contact");
  return { title: t("pageTitle") };
}

export default async function ContactPage() {
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-hajr-ivory">
      {/* nav */}
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

      {/* navy header band */}
      <section className="bg-hajr-deep-navy">
        <div className="container py-14 text-center sm:py-16">
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{t("Contact.pageTitle")}</h1>
          <p className="mx-auto mt-3 max-w-xl text-white/65">{t("Landing.contactSubtitle")}</p>
        </div>
      </section>

      {/* content */}
      <section className="container py-14">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-start">
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-hajr-muted">{t("Contact.introBody")}</p>
            <div className="space-y-3 pt-2">
              <InfoRow icon={Mail} label={t("Landing.contactEmailLabel")} value="hello@hajr.academy" />
              <InfoRow icon={Phone} label={t("Landing.contactPhoneLabel")} value="+966 11 000 0000" />
              <InfoRow icon={MapPin} label={t("Landing.contactAddressLabel")} value={t("Landing.contactAddressValue")} />
            </div>
          </div>
          <Card className="p-6 sm:p-8">
            <ContactForm />
          </Card>
        </div>
      </section>

      <footer className="bg-hajr-deep-navy text-white">
        <div className="container py-8 text-center text-sm text-white/45">
          © <span className="num">2026</span> {t("Brand.fullName")}. {t("Landing.footerRights")}
        </div>
      </footer>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-hajr-border bg-white p-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-hajr-surface">
        <Icon className="h-5 w-5 text-hajr-navy" />
      </span>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-hajr-light">{label}</div>
        <div className="text-sm font-semibold text-hajr-navy">{value}</div>
      </div>
    </div>
  );
}
