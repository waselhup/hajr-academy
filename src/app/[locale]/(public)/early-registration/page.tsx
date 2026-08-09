import type { Metadata } from "next";
import { listActiveProducts } from "@/lib/finance/catalog";
import { BRAND } from "@/lib/brand";
import s from "./early-registration.module.css";
import { getContent, buyHref, waHref, OFFER_ENDS_ISO, UTM } from "./content";
import { OfferBar, SiteNav, ProgramTabs, ScrollOffset, type Tab } from "./interactive";

export const dynamic = "force-dynamic";

const PATH = "early-registration";
const SITE = BRAND.site;

/**
 * Contact address shown on the page.
 *
 * The design specified hello@hajracademy.com. There is no MX record on
 * hajracademy.com — mail to that address bounces, so printing it would have
 * been a dead contact on a paid-campaign page. The academy's live inbox is
 * used until the owner points MX at a mailbox.
 */
const CONTACT_EMAIL = "hajracademy@gmail.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const c = getContent(locale);
  const url = `${SITE}/${locale}/${PATH}`;
  return {
    title: c.meta.title,
    description: c.meta.description,
    alternates: {
      canonical: url,
      languages: {
        ar: `${SITE}/ar/${PATH}`,
        en: `${SITE}/en/${PATH}`,
        "x-default": `${SITE}/ar/${PATH}`,
      },
    },
    openGraph: {
      title: c.meta.ogTitle,
      description: c.meta.ogDescription,
      url,
      type: "website",
      locale: locale === "ar" ? "ar_SA" : "en_US",
    },
    other: { "theme-color": "#1E2A36" },
  };
}

/** Western digits with thousands separators — the platform-wide rule. */
function money(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export default async function EarlyRegistrationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = getContent(locale);
  const isAr = c.isAr;
  const otherLocale = isAr ? "en" : "ar";

  // Prices come from the catalogue, never from this file: the number the page
  // advertises is the number /checkout will charge.
  const products = await listActiveProducts();
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const firstMonth = bySlug.get("early-first-month");
  const heroPrice = firstMonth ? money(firstMonth.priceSar) : "300";
  const heroWas = firstMonth?.compareAtSar ? money(firstMonth.compareAtSar) : "350";

  const tabs: Tab[] = c.programs.tabs.map((t) => ({
    id: t.id,
    label: t.label,
    heading: t.heading,
    sub: t.sub,
    wide: t.wide,
    cards: t.cards
      // A card whose product is missing or retired is dropped rather than
      // rendered with a broken price and a link to nothing.
      .filter((card) => bySlug.has(card.slug))
      .map((card) => {
        const p = bySlug.get(card.slug)!;
        return {
          slug: card.slug,
          tag: card.tag,
          title: card.title,
          titleLatin: card.titleLatin,
          desc: card.desc,
          price: money(p.priceSar),
          unit: isAr ? p.unitAr : p.unitEn,
          features: card.features,
          cta: card.cta,
          href: buyHref(locale, card.slug),
          rose: card.rose,
        };
      }),
  }));

  const enrollHref = `/${locale}/checkout?${UTM}`;
  const whatsapp = waHref(isAr);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "HAJR A° Academy",
    url: `${SITE}/${locale}`,
    telephone: `+${BRAND.contact.whatsapp}`,
    email: CONTACT_EMAIL,
    address: {
      "@type": "PostalAddress",
      addressLocality: isAr ? "الأحساء" : "Al Ahsa",
      addressCountry: "SA",
    },
    description: isAr
      ? "أكاديمية سعودية لتعليم الإنجليزية مباشرة عبر الإنترنت."
      : "A Saudi online English academy teaching live over the internet.",
  };

  return (
    <div className={s.root} id="top">
      <ScrollOffset />

      <div className={s.stickyShell}>
        <OfferBar
          endsIso={OFFER_ENDS_ISO}
          save={c.offer.save}
          pct={c.offer.pct}
          ends={c.offer.ends}
          claim={c.offer.claim}
          ended={c.offer.ended}
          dayWord={c.offer.dayWord}
          hourWord={c.offer.hourWord}
        />
        <SiteNav
          ariaLabel={c.nav.aria}
          brandAria={c.nav.brandAria}
          menuAria={c.nav.menuAria}
          links={c.nav.links}
          enrollLabel={c.nav.enroll}
          enrollHref={enrollHref}
          languageHref={`/${otherLocale}/${PATH}`}
          languageCode={isAr ? "EN" : "AR"}
          languageAria={isAr ? "Switch to English" : "التبديل إلى العربية"}
        />
      </div>

      <main>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <header className={s.hero}>
          <div className={`${s.container} ${s.heroGrid}`}>
            <div className={s.heroCopy}>
              <span className={s.heroKicker}>{c.hero.kicker}</span>
              <h1>
                {c.hero.titleStart}
                <span>{c.hero.titleAccent}</span>
              </h1>
              <p className={s.heroLead}>{c.hero.lead}</p>
              <div className={s.heroActions}>
                <a className={`${s.btn} ${s.btnPrimary}`} href="#early-pricing">
                  {c.hero.ctaPrimary}
                </a>
                <a className={`${s.btn} ${s.btnOutline}`} href="#all-programs">
                  {c.hero.ctaSecondary}
                </a>
              </div>
              <div className={s.heroNote}>
                {c.hero.notes.map((n) => (
                  <span key={n}>
                    <i>✓</i> {n}
                  </span>
                ))}
              </div>
            </div>

            <div className={s.heroVisual}>
              <div className={s.heroPanel} />
              <div className={`${s.heroPortrait} ${s.pPrimary}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.hero.portraits[0].src} alt={c.hero.portraits[0].alt} />
              </div>
              <div className={`${s.heroPortrait} ${s.pMiddle}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.hero.portraits[1].src} alt={c.hero.portraits[1].alt} />
              </div>
              <div className={`${s.heroPortrait} ${s.pHigh}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.hero.portraits[2].src} alt={c.hero.portraits[2].alt} />
              </div>
              <div className={s.heroOffer}>
                <small>{c.hero.offerLabel}</small>
                <div className={s.heroPrice}>
                  <strong>{heroPrice}</strong>
                  <span>{c.hero.currency}</span>
                </div>
                <span className={s.oldPrice}>
                  {c.hero.was} {heroWas} {c.hero.currency}
                </span>
              </div>
              <div className={s.heroBadge}>{c.hero.badge}</div>
            </div>
          </div>
        </header>

        {/* ── Proof ────────────────────────────────────────────── */}
        <section className={s.proofStrip} aria-label={c.proof.aria}>
          <div className={`${s.container} ${s.proofGrid}`}>
            {c.proof.items.map((p) => (
              <div className={s.proofItem} key={p.label}>
                <strong>{p.value}</strong>
                <span>{p.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── What's included ──────────────────────────────────── */}
        <section className={s.section} id="why">
          <div className={s.container}>
            <div className={s.sectionHead}>
              <span className={s.eyebrow}>{c.why.eyebrow}</span>
              <h2>{c.why.title}</h2>
              <p>{c.why.sub}</p>
            </div>
            <div className={s.benefitGrid}>
              {c.why.cards.map((b) => (
                <article className={s.benefitCard} key={b.title}>
                  <div className={s.benefitIcon}>{b.icon}</div>
                  <h3 className={b.latin ? s.latin : undefined}>{b.title}</h3>
                  <p>{b.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stages ───────────────────────────────────────────── */}
        <section className={`${s.section} ${s.sectionDark}`} id="stages">
          <div className={s.container}>
            <div className={s.sectionHead}>
              <span className={s.eyebrow}>{c.stages.eyebrow}</span>
              <h2>{c.stages.title}</h2>
              <p>{c.stages.sub}</p>
            </div>
            <div className={s.stageGrid}>
              {c.stages.cards.map((st) => (
                <article className={s.stageCard} key={st.label}>
                  <span className={s.stageLabel}>{st.label}</span>
                  <h3>{st.title}</h3>
                  <p>{st.desc}</p>
                  <ul className={s.stagePoints}>
                    {st.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={st.img} alt={st.alt} />
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Early pricing ────────────────────────────────────── */}
        <section className={s.section} id="early-pricing">
          <div className={`${s.container} ${s.pricingWrap}`}>
            <div className={s.sectionHead}>
              <span className={s.eyebrow}>{c.pricing.eyebrow}</span>
              <h2>{c.pricing.title}</h2>
              <p>{c.pricing.sub}</p>
            </div>
            <div className={s.pricingSummary}>
              <div>
                <strong>{c.pricing.summaryTitle}</strong>
                <p>{c.pricing.summaryBody}</p>
              </div>
              <span className={s.ends}>{c.pricing.endsLabel}</span>
            </div>
            <div className={s.pricingGrid}>
              {c.pricing.plans
                .filter((plan) => bySlug.has(plan.slug))
                .map((plan) => {
                  const p = bySlug.get(plan.slug)!;
                  return (
                    <article
                      className={`${s.priceCard} ${plan.best ? s.best : ""}`}
                      key={plan.slug}
                    >
                      <span className={s.discountPill}>{plan.discount}</span>
                      <span className={s.planKicker}>{plan.kicker}</span>
                      <h3>{plan.title}</h3>
                      <div className={s.priceLine}>
                        <strong>{money(p.priceSar)}</strong>
                        <span>{c.pricing.currency}</span>
                      </div>
                      {p.compareAtSar && (
                        <p className={s.priceOld}>
                          {c.pricing.was} <del>{money(p.compareAtSar)}</del> {c.pricing.currency}
                        </p>
                      )}
                      <ul>
                        {plan.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                      <a
                        className={`${s.btn} ${plan.best ? s.btnRose : s.btnDark} ${s.btnBlock}`}
                        href={buyHref(locale, plan.slug)}
                        data-plan={plan.slug}
                      >
                        {plan.cta}
                      </a>
                    </article>
                  );
                })}
            </div>
            <div className={s.secureRow}>
              <span>{c.pricing.secure}</span>
              {c.pricing.chips.map((chip) => (
                <span className={s.payChip} key={chip}>
                  {chip}
                </span>
              ))}
              <span>{c.pricing.invoice}</span>
            </div>
          </div>
        </section>

        {/* ── All programmes ───────────────────────────────────── */}
        <section className={`${s.section} ${s.sectionSoft}`} id="all-programs">
          <div className={s.container}>
            <div className={s.sectionHead}>
              <span className={s.eyebrow}>{c.programs.eyebrow}</span>
              <h2>{c.programs.title}</h2>
              <p>{c.programs.sub}</p>
            </div>
            <ProgramTabs tabs={tabs} tablistAria={c.programs.tablistAria} />
          </div>
        </section>

        {/* ── Platform ─────────────────────────────────────────── */}
        <section className={`${s.section} ${s.sectionDark}`} id="platform">
          <div className={`${s.container} ${s.labGrid}`}>
            <div className={s.labCopy}>
              <span className={s.eyebrow}>{c.lab.eyebrow}</span>
              <h2>{c.lab.title}</h2>
              <p>{c.lab.sub}</p>
              <div className={s.labList}>
                {c.lab.points.map((p) => (
                  <div className={s.labPoint} key={p.t}>
                    <strong>{p.t}</strong>
                    {p.d}
                  </div>
                ))}
              </div>
              <div className={s.journeySteps} aria-label={c.lab.stepsAria}>
                {c.lab.steps.map((step, i) => (
                  <div className={s.journeyStep} key={step}>
                    <b>{i + 1}</b>
                    {step}
                  </div>
                ))}
              </div>
            </div>
            <div className={s.platformVisual}>
              <div className={s.platformScreen}>
                <div className={s.screenTop}>
                  <div className={s.screenLogo}>
                    HAJR <span>A°</span>
                  </div>
                  <div className={s.screenAvatar}>A°</div>
                </div>
                <div className={s.progressCard}>
                  <span>{c.lab.screen.progressLabel}</span>
                  <strong>{c.lab.screen.progressTitle}</strong>
                  <div className={s.progressBar}>
                    <i />
                  </div>
                </div>
                <div className={s.taskGrid}>
                  {c.lab.screen.tasks.map((t) => (
                    <div className={s.task} key={t.t}>
                      <b>{t.t}</b>
                      <span>{t.s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <section className={`${s.section} ${s.sectionSoft}`} id="faq">
          <div className={s.container}>
            <div className={s.sectionHead}>
              <span className={s.eyebrow}>{c.faq.eyebrow}</span>
              <h2>{c.faq.title}</h2>
              <p>{c.faq.sub}</p>
            </div>
            <div className={s.faqWrap}>
              {c.faq.items.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────── */}
        <section className={s.finalCta}>
          <div className={s.container}>
            <div className={s.finalBox}>
              <div>
                <h2>{c.finalCta.title}</h2>
                <p>{c.finalCta.sub}</p>
              </div>
              <div className={s.finalActions}>
                <a className={`${s.btn} ${s.btnPrimary}`} href={enrollHref}>
                  {c.finalCta.primary}
                </a>
                <a
                  className={`${s.btn} ${s.btnOutline}`}
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {c.finalCta.secondary}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.container}>
          <div className={s.footerGrid}>
            <div className={s.footerBrand}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/logo-transparent-white.png" alt="HAJR A° Academy" width={180} height={48} />
              <p>{c.footer.about}</p>
            </div>
            <div>
              <h3>{c.footer.earlyTitle}</h3>
              {c.footer.earlyLinks.map((l) => (
                <a href="#early-pricing" key={l}>
                  {l}
                </a>
              ))}
            </div>
            <div>
              <h3>{c.footer.programsTitle}</h3>
              {c.footer.programsLinks.map((l) => (
                <a href="#all-programs" key={l}>
                  {l}
                </a>
              ))}
            </div>
            <div>
              <h3>{c.footer.contactTitle}</h3>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                {c.footer.whatsappLabel}{" "}
                <span className={s.latin}>{BRAND.contact.phone}</span>
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              <a href={`/${locale}`}>hajracademy.com</a>
            </div>
          </div>
          <div className={s.copyright}>{c.footer.copyright}</div>
        </div>
      </footer>

      <a
        className={s.whatsapp}
        href={whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={c.whatsappAria}
      >
        WA
      </a>

      <script
        type="application/ld+json"
        // Static, server-built object — no user input reaches it.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
