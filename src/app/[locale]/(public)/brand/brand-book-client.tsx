"use client";

/**
 * HAJR A° Academy Brand Book — public, 25 sections, mirrors the
 * Figma source (https://desk-studio-27726469.figma.site).
 *
 * Sticky 260-px left sidebar with active-row tracking via
 * IntersectionObserver. Sections rendered inline so the page is one
 * scrollable spread, just like the Figma export.
 */
import { useEffect, useRef, useState } from "react";
import { HajrLogo } from "@/components/brand/logo";
import { GatewayLines, AWatermark } from "@/components/brand/visual-language";
import { BRAND } from "@/lib/brand";

interface NavEntry {
  id: string;
  num: string;
  label: string;
}

const NAV: NavEntry[] = [
  { id: "introduction",          num: "01", label: "Introduction" },
  { id: "brand-positioning",     num: "02", label: "Brand Positioning" },
  { id: "logo-system",           num: "03", label: "Logo System" },
  { id: "logo-usage",            num: "04", label: "Logo Usage Rules" },
  { id: "color-system",          num: "05", label: "Color System" },
  { id: "typography",            num: "06", label: "Typography" },
  { id: "visual-language",       num: "07", label: "Visual Language" },
  { id: "icon-system",           num: "08", label: "Icon System" },
  { id: "web-components",        num: "09", label: "Web Components" },
  { id: "website-ui-kit",        num: "10", label: "Website UI Kit" },
  { id: "social-media",          num: "11", label: "Social Media" },
  { id: "social-profiles",       num: "12", label: "Social Profiles" },
  { id: "marketing-assets",      num: "13", label: "Marketing Assets" },
  { id: "powerpoint",            num: "14", label: "PowerPoint Templates" },
  { id: "corporate-identity",    num: "15", label: "Corporate Identity" },
  { id: "business-cards",        num: "16", label: "Business Cards" },
  { id: "letterhead",            num: "17", label: "Letterhead" },
  { id: "contracts",             num: "18", label: "Contract Templates" },
  { id: "stamps",                num: "19", label: "Stamps" },
  { id: "email-signatures",      num: "20", label: "Email Signatures" },
  { id: "id-cards",              num: "21", label: "ID Cards" },
  { id: "folders",               num: "22", label: "Document Folders" },
  { id: "photography",           num: "23", label: "Photography Guide" },
  { id: "ai-prompts",            num: "24", label: "AI Prompt Library" },
  { id: "downloads",             num: "25", label: "Downloads" },
];

export function BrandBookClient() {
  const [active, setActive] = useState<string>("introduction");
  const sectionsRef = useRef<Record<string, HTMLElement | null>>({});

  // Track which section is currently in the viewport.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport that's
        // intersecting — gives stable active highlighting on scroll.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = visible[0].target.getAttribute("id");
          if (id) setActive(id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    NAV.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-hajr-ivory">
      <div className="mx-auto flex max-w-[1400px]">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="hidden w-[260px] shrink-0 border-e border-hajr-border bg-white lg:block">
          <div className="sticky top-0 max-h-screen overflow-y-auto">
            <div className="border-b border-hajr-border px-6 py-7">
              <HajrLogo size="sm" variant="mark" />
              <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-hajr-muted">
                Brand Book · v1.0 · 2026
              </p>
            </div>
            <nav className="px-3 py-4">
              <ul className="space-y-0.5">
                {NAV.map((n) => {
                  const isActive = active === n.id;
                  return (
                    <li key={n.id}>
                      <a
                        href={`#${n.id}`}
                        className={
                          "group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors " +
                          (isActive
                            ? "bg-hajr-deep-navy text-white"
                            : "text-hajr-body hover:bg-hajr-hover")
                        }
                      >
                        <span
                          className={
                            "num text-[10px] font-medium tabular-nums " +
                            (isActive ? "text-white/70" : "text-hajr-muted")
                          }
                        >
                          {n.num}
                        </span>
                        <span className="truncate">{n.label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────────── */}
        <main className="min-w-0 flex-1 px-6 py-10 sm:px-10 sm:py-14 lg:px-16">
          <PageHeader />
          <div className="mt-12 space-y-20">
            <Section01Introduction />
            <Section02BrandPositioning />
            <Section03LogoSystem />
            <Section04LogoUsage />
            <Section05ColorSystem />
            <Section06Typography />
            <Section07VisualLanguage />
            <Section08IconSystem />
            <Section09WebComponents />
            <Section10WebsiteUIKit />
            <Section11SocialMedia />
            <Section12SocialProfiles />
            <Section13MarketingAssets />
            <Section14PowerPoint />
            <Section15CorporateIdentity />
            <Section16BusinessCards />
            <Section17Letterhead />
            <Section18Contracts />
            <Section19Stamps />
            <Section20EmailSignatures />
            <Section21IDCards />
            <Section22Folders />
            <Section23Photography />
            <Section24AIPrompts />
            <Section25Downloads />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */

function PageHeader() {
  return (
    <header className="border-b border-hajr-border pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-hajr-muted">
            HAJR A° Academy
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl">Brand Book &amp; Design System</h1>
          <p className="mt-3 max-w-2xl text-sm text-hajr-body">
            A comprehensive design system and brand guidelines for consistent,
            professional brand application across all touchpoints.
          </p>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[0.32em] text-hajr-muted">
          Version 1.0 · 2026
        </span>
      </div>
    </header>
  );
}

function SectionHeading({
  num,
  title,
  subtitle,
}: {
  num: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8">
      <p className="num text-[10px] font-medium uppercase tracking-[0.32em] text-hajr-muted">
        Section {num}
      </p>
      <h2 className="mt-3 text-2xl sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-3 max-w-2xl text-sm text-hajr-body">{subtitle}</p>}
    </div>
  );
}

function Card({
  children,
  className = "",
  dark = false,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
  padded?: boolean;
}) {
  return (
    <div
      className={
        "relative overflow-hidden rounded-2xl " +
        (padded ? "p-6 sm:p-8 " : "") +
        (dark
          ? "bg-hajr-deep-navy text-white "
          : "bg-white text-hajr-text shadow-sm ring-1 ring-hajr-border ") +
        className
      }
    >
      {children}
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-hajr-muted">
      {children}
    </p>
  );
}

/* ──────────────────────  01 — Introduction  ──────────────────── */

function Section01Introduction() {
  const items = [
    "Logo system with all variations",
    "Complete color palette with accessibility guidelines",
    "Typography scale and usage rules",
    "Visual language elements (gateway lines, patterns)",
    "Icon system with custom education icons",
    "Web component library",
    "Social media templates for all platforms",
    "Marketing assets and promotional templates",
    "Complete corporate identity system",
    "Design tokens and CSS variables",
    "Do's and don'ts examples",
    "Technical specifications for production",
  ];
  return (
    <section id="introduction" className="scroll-mt-8">
      <SectionHeading num="01" title="Introduction" />
      <Card className="mb-6">
        <div className="flex items-center gap-6">
          <HajrLogo size="lg" variant="full" />
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <SubLabel>Complete System</SubLabel>
          <p className="mt-2 text-sm text-hajr-body">
            Logo, colors, typography, icons, components, and templates.
          </p>
        </Card>
        <Card>
          <SubLabel>Production Ready</SubLabel>
          <p className="mt-2 text-sm text-hajr-body">
            All assets optimized for print, web, and social media.
          </p>
        </Card>
        <Card>
          <SubLabel>Future Proof</SubLabel>
          <p className="mt-2 text-sm text-hajr-body">
            Built for consistency and scalability over 20+ years.
          </p>
        </Card>
      </div>
      <Card className="mt-6">
        <SubLabel>What's Included</SubLabel>
        <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-hajr-body sm:grid-cols-2">
          {items.map((i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-hajr-rose" />
              <span>{i}</span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

/* ──────────────────────  02 — Brand Positioning  ──────────────── */

function Section02BrandPositioning() {
  return (
    <section id="brand-positioning" className="scroll-mt-8">
      <SectionHeading
        num="02"
        title="Brand Positioning"
        subtitle="HAJR A° Academy is a premium Saudi educational institution combining modern excellence with traditional values."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SubLabel>Mission</SubLabel>
          <p className="mt-3 text-sm text-hajr-body">
            Empower students with world-class English language education —
            confidence, growth, global opportunities through excellence in
            teaching and personalised learning.
          </p>
        </Card>
        <Card>
          <SubLabel>Vision</SubLabel>
          <p className="mt-3 text-sm text-hajr-body">
            Become Saudi Arabia's most trusted educational institution,
            recognised for transforming lives through premium language
            education and student success.
          </p>
        </Card>
      </div>
      <Card className="mt-4">
        <SubLabel>Brand Personality</SubLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "Modern",
            "Premium",
            "Confident",
            "Approachable",
            "Growth-oriented",
            "Clean",
            "Timeless",
            "Global Standards",
          ].map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </div>
      </Card>
      <Card className="mt-4">
        <SubLabel>Brand Keywords</SubLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "Confidence",
            "Growth",
            "Knowledge",
            "Opportunity",
            "Transformation",
            "Achievement",
            "Guidance",
            "Excellence",
          ].map((t) => (
            <Chip key={t} outline>
              {t}
            </Chip>
          ))}
        </div>
      </Card>
      <Card className="mt-4 text-center">
        <SubLabel>Brand Promise</SubLabel>
        <p className="mx-auto mt-4 max-w-xl text-lg font-light italic text-hajr-deep-navy">
          "I can grow here. My future starts here."
        </p>
      </Card>
    </section>
  );
}

function Chip({
  children,
  outline = false,
}: {
  children: React.ReactNode;
  outline?: boolean;
}) {
  return (
    <span
      className={
        "inline-flex rounded-full px-3 py-1 text-xs font-medium " +
        (outline
          ? "border border-hajr-border text-hajr-body"
          : "bg-hajr-ivory text-hajr-deep-navy")
      }
    >
      {children}
    </span>
  );
}

/* ──────────────────────  03 — Logo System  ─────────────────────── */

function Section03LogoSystem() {
  return (
    <section id="logo-system" className="scroll-mt-8">
      <SectionHeading
        num="03"
        title="Logo System"
        subtitle="Primary and secondary lockups plus the standalone A° monogram. The accent A° is always set in light weight (300) mauve."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex aspect-[16/9] items-center justify-center">
          <HajrLogo size="xl" variant="full" />
        </Card>
        <Card dark className="flex aspect-[16/9] items-center justify-center">
          <HajrLogo size="xl" variant="full" light />
        </Card>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="flex aspect-square items-center justify-center">
          <HajrLogo size="lg" variant="mark" />
        </Card>
        <Card className="flex aspect-square items-center justify-center">
          <span
            className="font-en font-light leading-none"
            style={{
              color: "#B86E7B",
              fontWeight: 300,
              fontSize: "5rem",
              letterSpacing: "-0.02em",
            }}
          >
            A°
          </span>
        </Card>
        <Card dark className="flex aspect-square items-center justify-center" padded={false}>
          <HajrLogo size="lg" variant="app-icon" />
        </Card>
      </div>
      <Card className="mt-4">
        <SubLabel>Specs (canonical)</SubLabel>
        <ul className="mt-3 grid gap-2 text-sm text-hajr-body sm:grid-cols-2">
          <li>
            <span className="font-medium text-hajr-deep-navy">HAJR wordmark</span> —
            Inter Bold (700), letter-spacing <span className="num">-0.02em</span>, deep navy or cream.
          </li>
          <li>
            <span className="font-medium text-hajr-deep-navy">A° accent</span> — Inter
            Light (300), color <span className="num">#B86E7B</span>, ml <span className="num">0.1em</span>.
          </li>
          <li>
            <span className="font-medium text-hajr-deep-navy">ACADEMY tagline</span> —
            Inter Regular (400), letter-spacing <span className="num">0.3em</span>, opacity 0.7.
          </li>
          <li>
            <span className="font-medium text-hajr-deep-navy">Monogram</span> — A° alone, for social avatars and app icons.
          </li>
        </ul>
      </Card>
    </section>
  );
}

/* ──────────────────────  04 — Logo Usage Rules  ─────────────────── */

function Section04LogoUsage() {
  const dont = [
    "Don't stretch — never distort logo proportions.",
    "Don't rotate — keep the logo horizontal and upright.",
    "Don't use wrong colors — only approved brand colors.",
    "Don't change spacing — maintain approved spacing.",
    "Don't reduce opacity — use logo at 100% opacity.",
    "Don't use busy backgrounds — solid, brand-appropriate only.",
  ];
  const formats = [
    { name: "SVG", note: "Web, digital, scalable. Best for web." },
    { name: "PNG", note: "Digital, presentations. Transparent backgrounds." },
    { name: "EPS", note: "Print, professional design. Vector for print." },
    { name: "PDF", note: "Documents, sharing. Universal format." },
  ];
  return (
    <section id="logo-usage" className="scroll-mt-8">
      <SectionHeading
        num="04"
        title="Logo Usage Rules"
        subtitle="Essential guidelines for correct logo usage, safe zones, minimum sizes, and common mistakes to avoid."
      />
      <Card>
        <SubLabel>Logo Safe Zone</SubLabel>
        <div className="mt-4 flex items-center justify-center rounded-xl bg-hajr-ivory p-10">
          <div className="relative">
            <HajrLogo size="lg" variant="mark" />
            <span className="absolute -left-8 top-1/2 -translate-y-1/2 text-xs text-hajr-muted">×</span>
            <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-xs text-hajr-muted">×</span>
            <span className="absolute left-1/2 -top-6 -translate-x-1/2 text-xs text-hajr-muted">×</span>
            <span className="absolute left-1/2 -bottom-6 -translate-x-1/2 text-xs text-hajr-muted">×</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-hajr-muted">
          × = height of the A° symbol. Maintain this minimum clearance on all sides.
        </p>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <SubLabel>Minimum Sizes — Print</SubLabel>
          <ul className="mt-3 space-y-2 text-sm text-hajr-body">
            <li><span className="font-medium text-hajr-deep-navy">Full Logo</span> — min 40mm. Business cards, letterhead, brochures.</li>
            <li><span className="font-medium text-hajr-deep-navy">Monogram</span> — min 15mm. Small items, patterns, stamps.</li>
          </ul>
        </Card>
        <Card>
          <SubLabel>Minimum Sizes — Digital</SubLabel>
          <ul className="mt-3 space-y-2 text-sm text-hajr-body">
            <li><span className="font-medium text-hajr-deep-navy">Full Logo</span> — min 160px. Websites, social media, emails.</li>
            <li><span className="font-medium text-hajr-deep-navy">Monogram</span> — min 32px. Favicon, app icon, profile picture.</li>
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <SubLabel>Don'ts</SubLabel>
        <ul className="mt-3 grid gap-2 text-sm text-hajr-body sm:grid-cols-2">
          {dont.map((d) => (
            <li key={d} className="flex gap-2">
              <span className="mt-1 inline-block h-4 w-4 shrink-0 rounded-full bg-red-50 text-center text-[10px] font-bold leading-4 text-red-700">×</span>
              {d}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4">
        <SubLabel>Available File Formats</SubLabel>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {formats.map((f) => (
            <div key={f.name} className="rounded-xl border border-hajr-border p-4">
              <p className="num text-lg font-semibold text-hajr-deep-navy">{f.name}</p>
              <p className="mt-1 text-xs text-hajr-muted">{f.note}</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

/* ──────────────────────  05 — Color System  ───────────────────── */

function Section05ColorSystem() {
  const palette = [
    { name: "Deep Navy",     hex: BRAND.palette.deepNavy, rgb: "30, 42, 54",   note: "Primary 70%", dark: true  },
    { name: "Charcoal Navy", hex: BRAND.palette.navy,     rgb: "44, 62, 80",   note: "Secondary 15%", dark: true },
    { name: "Ivory Silk",    hex: BRAND.palette.ivory,    rgb: "250, 246, 238", note: "Background 10%", dark: false },
    { name: "Rose Mauve",    hex: BRAND.palette.rose,     rgb: "184, 110, 123", note: "Accent 3%", dark: true  },
    { name: "Mint Frost",    hex: BRAND.palette.mint,     rgb: "181, 229, 216", note: "Support 2%", dark: false },
  ];
  return (
    <section id="color-system" className="scroll-mt-8">
      <SectionHeading
        num="05"
        title="Color System"
        subtitle="Five locked colours with proportion rule 70 / 15 / 10 / 3 / 2. Rose mauve is accent only — never a large surface."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {palette.map((c) => (
          <div
            key={c.hex}
            className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-hajr-border"
          >
            <div
              className="flex h-36 items-end justify-end p-3"
              style={{ background: c.hex }}
            >
              <span
                className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-medium backdrop-blur"
                style={{ color: c.dark ? "#FFFFFF" : "#1E2A36" }}
              >
                {c.note}
              </span>
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold text-hajr-deep-navy">{c.name}</p>
              <p className="num mt-0.5 text-xs text-hajr-muted">{c.hex}</p>
              <p className="num mt-0.5 text-[11px] text-hajr-muted">rgb({c.rgb})</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────  06 — Typography  ─────────────────────── */

function Section06Typography() {
  const scale = [
    { name: "Heading 1", size: "56 / 3.5rem", weight: "Semibold 600", use: "Hero headlines", styleObj: { fontSize: "56px", fontWeight: 600, lineHeight: "1.2", letterSpacing: "-0.02em" } },
    { name: "Heading 2", size: "48 / 3rem",   weight: "Semibold 600", use: "Section headlines",   styleObj: { fontSize: "48px", fontWeight: 600, lineHeight: "1.2", letterSpacing: "-0.02em" } },
    { name: "Heading 3", size: "36 / 2.25rem", weight: "Semibold 600", use: "Card titles",         styleObj: { fontSize: "36px", fontWeight: 600, lineHeight: "1.2", letterSpacing: "-0.02em" } },
    { name: "Heading 4", size: "28 / 1.75rem", weight: "Medium 500",   use: "Component headers",   styleObj: { fontSize: "28px", fontWeight: 500, lineHeight: "1.2" } },
    { name: "Body L",    size: "18 / 1.125rem", weight: "Regular 400",  use: "Intro paragraphs",    styleObj: { fontSize: "18px", fontWeight: 400, lineHeight: "1.75" } },
    { name: "Body M",    size: "16 / 1rem",     weight: "Regular 400",  use: "Body paragraphs",     styleObj: { fontSize: "16px", fontWeight: 400, lineHeight: "1.5" } },
    { name: "Caption",   size: "12 / 0.75rem",  weight: "Regular 400",  use: "Labels, legal",       styleObj: { fontSize: "12px", fontWeight: 400, lineHeight: "1.5" } },
  ];
  return (
    <section id="typography" className="scroll-mt-8">
      <SectionHeading
        num="06"
        title="Typography Scale"
        subtitle="Inter for English. IBM Plex Sans Arabic for Arabic. Heading scale 1.2 line-height; body scale 1.5–1.75."
      />
      <Card className="space-y-5">
        {scale.map((row) => (
          <div
            key={row.name}
            className="grid items-baseline gap-4 border-b border-hajr-border pb-4 last:border-0 last:pb-0 md:grid-cols-[1fr_auto]"
          >
            <span style={row.styleObj} className="block text-hajr-deep-navy">
              {row.name} — Aa
            </span>
            <span className="text-xs text-hajr-muted">
              <span className="num">{row.size}</span> · {row.weight} · {row.use}
            </span>
          </div>
        ))}
      </Card>
      <Card className="mt-4">
        <SubLabel>Font Weights</SubLabel>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { n: "Light", w: 300 },
            { n: "Regular", w: 400 },
            { n: "Medium", w: 500 },
            { n: "Semibold", w: 600 },
            { n: "Bold", w: 700 },
          ].map((f) => (
            <div key={f.w} className="rounded-xl border border-hajr-border p-3 text-center">
              <p
                style={{ fontWeight: f.w, fontSize: "20px", color: "#1E2A36" }}
              >
                Aa
              </p>
              <p className="num mt-1 text-xs text-hajr-muted">{f.n} {f.w}</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

/* ──────────────────────  07 — Visual Language  ──────────────────── */

function Section07VisualLanguage() {
  return (
    <section id="visual-language" className="scroll-mt-8">
      <SectionHeading
        num="07"
        title="Visual Language"
        subtitle="Two recurring motifs: gateway lines (architectural threshold) and the A° watermark (whispered brand presence)."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SubLabel>Gateway Lines</SubLabel>
          <div className="mt-4 flex h-48 items-center justify-center rounded-xl bg-hajr-ivory">
            <GatewayLines height={80} gap={36} />
          </div>
          <p className="mt-4 text-xs text-hajr-muted">
            Two thin vertical lines with soft gradient fade. Architectural metaphor — doorway / threshold.
          </p>
        </Card>
        <Card>
          <SubLabel>A° Watermark</SubLabel>
          <div className="relative mt-4 flex h-48 items-center justify-center overflow-hidden rounded-xl bg-hajr-ivory">
            <AWatermark size="text-[14rem]" position="br" />
            <div className="relative text-center">
              <p className="font-medium text-hajr-deep-navy">Content title</p>
              <p className="mt-1 text-xs text-hajr-muted">Supporting line</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-hajr-muted">
            Oversized A° at 3% opacity in light weight — quiet brand presence on heroes and section blocks.
          </p>
        </Card>
      </div>
    </section>
  );
}

/* ──────────────────────  08 — Icon System  ───────────────────── */

function Section08IconSystem() {
  return (
    <section id="icon-system" className="scroll-mt-8">
      <SectionHeading
        num="08"
        title="Icon System"
        subtitle="2px stroke, rounded line caps, 24×24 base. Brand colors only. Use Lucide as 1:1 substitutes."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Stroke", value: "2px" },
          { label: "Corner", value: "Round" },
          { label: "Base size", value: "24×24" },
        ].map((s) => (
          <Card key={s.label}>
            <SubLabel>{s.label}</SubLabel>
            <p className="num mt-2 text-xl font-semibold text-hajr-deep-navy">{s.value}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-4">
        <SubLabel>Educational Icons (16)</SubLabel>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-hajr-body sm:grid-cols-4 md:grid-cols-8">
          {[
            "Course","Teacher","Live Class","Certificate","Lab","Book","Reading","Writing",
            "Speaking","Listening","Calendar","Progress","Achievement","Support","Exam","Success",
          ].map((i) => (
            <div key={i} className="rounded-md border border-hajr-border p-2 text-center">
              {i}
            </div>
          ))}
        </div>
        <SubLabel>Social Icons (9)</SubLabel>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-hajr-body sm:grid-cols-4 md:grid-cols-9">
          {["X","Instagram","TikTok","Snapchat","LinkedIn","YouTube","WhatsApp","Telegram","Facebook"].map((i) => (
            <div key={i} className="rounded-md border border-hajr-border p-2 text-center">{i}</div>
          ))}
        </div>
      </Card>
    </section>
  );
}

/* ──────────────────────  09 — Web Components  ──────────────────── */

function Section09WebComponents() {
  return (
    <section id="web-components" className="scroll-mt-8">
      <SectionHeading num="09" title="Buttons" subtitle="Primary navy. Mauve for the one CTA per page. Mint for success." />
      <Card>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-lg bg-hajr-deep-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-hajr-navy">Primary</button>
          <button className="rounded-lg bg-hajr-rose px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">CTA Accent</button>
          <button className="rounded-lg bg-hajr-mint px-5 py-2.5 text-sm font-medium text-hajr-deep-navy hover:opacity-90">Success</button>
          <button className="rounded-lg border border-hajr-navy bg-transparent px-5 py-2.5 text-sm font-medium text-hajr-navy hover:bg-hajr-navy/5">Outline</button>
          <button className="rounded-lg border border-hajr-rose bg-transparent px-5 py-2.5 text-sm font-medium text-hajr-rose hover:bg-hajr-rose/5">Outline Accent</button>
          <button className="rounded-lg px-5 py-2.5 text-sm font-medium text-hajr-rose hover:underline">Text Accent</button>
        </div>
      </Card>
    </section>
  );
}

/* ──────────────────────  10 — Website UI Kit  ──────────────────── */

function Section10WebsiteUIKit() {
  return (
    <section id="website-ui-kit" className="scroll-mt-8">
      <SectionHeading
        num="10"
        title="Website UI Kit"
        subtitle="Complete component library for building consistent, premium web experiences."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <SubLabel>Course Card</SubLabel>
          <div className="mt-4 inline-block rounded-full bg-hajr-ivory px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-hajr-deep-navy">12 Weeks</div>
          <h3 className="mt-3 text-xl">IELTS Preparation</h3>
          <p className="mt-2 text-sm text-hajr-body">Comprehensive course for IELTS success.</p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="num text-xl font-semibold text-hajr-deep-navy">2,999 SAR</span>
            <a href="#" className="text-sm text-hajr-rose hover:underline">Learn More →</a>
          </div>
        </Card>
        <Card>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-hajr-rose">Premium Plan</p>
          <p className="num mt-3 text-3xl font-semibold text-hajr-deep-navy">3,999<span className="text-sm text-hajr-muted"> SAR / mo</span></p>
          <ul className="mt-4 space-y-1.5 text-sm text-hajr-body">
            {["Unlimited access","Personal tutor","Live classes","Certificates"].map((i) => (
              <li key={i} className="flex gap-2">
                <span className="text-hajr-mint">✓</span>{i}
              </li>
            ))}
          </ul>
          <button className="mt-5 w-full rounded-lg bg-hajr-rose py-2 text-sm font-medium text-white">Get Started</button>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-hajr-deep-navy text-sm font-semibold text-white">SA</div>
            <div>
              <p className="text-sm font-medium text-hajr-deep-navy">Sarah Ahmed</p>
              <p className="text-xs text-hajr-muted">IELTS Graduate</p>
            </div>
          </div>
          <p className="mt-3 text-sm italic text-hajr-body">
            "HAJR A° Academy changed my future. From 5.5 to 8.0 in 12 weeks."
          </p>
        </Card>
      </div>
    </section>
  );
}

/* ──────────────────────  11 — Social Media  ──────────────────── */

function Section11SocialMedia() {
  const templates = [
    { name: "Course Announcement",   spec: "Mauve A° corner, NEW COURSE eyebrow, CTA: Register Now" },
    { name: "Educational Quote",     spec: "Centered light-weight quote, IELTS TIP badge, URL footer" },
    { name: "Promotion / Offer",     spec: "Discount hero (30% OFF), deadline date, Claim Offer CTA" },
    { name: "Student Success Story", spec: "Score delta block, pull-quote, student photo, program name" },
  ];
  return (
    <section id="social-media" className="scroll-mt-8">
      <SectionHeading
        num="11"
        title="Social Media Templates (1080×1080)"
        subtitle="Four editable square templates for Instagram, X, LinkedIn, and Snapchat."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map((t, i) => (
          <Card key={t.name}>
            <SocialPreview index={i} title={t.name} />
            <p className="mt-3 text-sm font-medium text-hajr-deep-navy">Template 0{i + 1} — {t.name}</p>
            <p className="mt-1 text-xs text-hajr-muted">{t.spec}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function SocialPreview({ index, title }: { index: number; title: string }) {
  const dark = index % 2 === 0;
  return (
    <div
      className={
        "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl " +
        (dark ? "bg-hajr-deep-navy text-white" : "bg-hajr-ivory text-hajr-deep-navy")
      }
    >
      <AWatermark
        color={dark ? "#FAF6EE" : "#1E2A36"}
        opacity={dark ? 0.08 : 0.05}
        size="text-[18rem]"
        position="br"
      />
      <div className="relative px-6 text-center">
        <div className={dark ? "" : ""}>
          <HajrLogo size="sm" variant="mark" light={dark} />
        </div>
        <p
          className={
            "mt-6 text-xl font-medium leading-snug " +
            (dark ? "text-white" : "text-hajr-deep-navy")
          }
        >
          {title}
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────  12 — Social Profiles  ──────────────────── */

function Section12SocialProfiles() {
  const table = [
    ["Instagram", "1080×1080", "—"],
    ["X (Twitter)", "400×400", "1500×500"],
    ["LinkedIn", "300×300", "1584×396"],
    ["YouTube", "800×800", "2560×1440"],
    ["WhatsApp", "640×640", "—"],
    ["Snapchat", "320×320", "1080×1920"],
    ["TikTok", "200×200", "—"],
    ["Facebook", "180×180", "820×312"],
  ];
  return (
    <section id="social-profiles" className="scroll-mt-8">
      <SectionHeading
        num="12"
        title="Social Profile Assets"
        subtitle="Profile pictures, covers, and highlights for every major platform."
      />
      <Card padded={false}>
        <table className="w-full text-sm">
          <thead className="border-b border-hajr-border bg-hajr-ivory">
            <tr>
              <th className="px-5 py-3 text-start text-[10px] font-medium uppercase tracking-[0.2em] text-hajr-muted">Platform</th>
              <th className="px-5 py-3 text-start text-[10px] font-medium uppercase tracking-[0.2em] text-hajr-muted">Profile</th>
              <th className="px-5 py-3 text-start text-[10px] font-medium uppercase tracking-[0.2em] text-hajr-muted">Cover</th>
            </tr>
          </thead>
          <tbody>
            {table.map((r) => (
              <tr key={r[0]} className="border-b border-hajr-border last:border-0">
                <td className="px-5 py-3 font-medium text-hajr-deep-navy">{r[0]}</td>
                <td className="num px-5 py-3 text-hajr-body">{r[1]}</td>
                <td className="num px-5 py-3 text-hajr-body">{r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

/* ──────────────────────  13 — Marketing Assets  ──────────────── */

function Section13MarketingAssets() {
  return (
    <section id="marketing-assets" className="scroll-mt-8">
      <SectionHeading
        num="13"
        title="Marketing Assets"
        subtitle="Course promotions, discount campaigns, testimonials, results / statistics, registration campaigns."
      />
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { v: "95%", l: "Success Rate" },
          { v: "8.0", l: "Avg IELTS Score" },
          { v: "5K+", l: "Graduates" },
          { v: "98%", l: "Satisfaction" },
        ].map((s) => (
          <Card key={s.l} className="text-center">
            <p className="num text-4xl font-semibold text-hajr-deep-navy">{s.v}</p>
            <p className="mt-2 text-xs text-hajr-muted">{s.l}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────  14 — PowerPoint  ───────────────────── */

function Section14PowerPoint() {
  const slides = [
    "Cover Slide",
    "Content (Single Column)",
    "Content (Two Column)",
    "Statistics / Numbers",
    "Timeline / Process",
    "Quote / Testimonial",
    "Image Full Width",
    "Closing / Thank You",
  ];
  return (
    <section id="powerpoint" className="scroll-mt-8">
      <SectionHeading
        num="14"
        title="PowerPoint Master Templates"
        subtitle="Professional 16:9 templates (1920×1080) for courses, proposals, and corporate presentations."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {slides.map((s) => (
          <Card key={s} padded={false}>
            <div className="aspect-video rounded-t-2xl bg-hajr-deep-navy">
              <AWatermark color="#FAF6EE" opacity={0.06} size="text-[8rem]" position="br" />
            </div>
            <p className="p-4 text-sm font-medium text-hajr-deep-navy">{s}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────  15 — Corporate Identity  ──────────────── */

function Section15CorporateIdentity() {
  const items = [
    { icon: "🪪", name: "Business Cards" },
    { icon: "📃", name: "Official Letterhead" },
    { icon: "📋", name: "Contract Templates" },
    { icon: "🔖", name: "Stamp System" },
    { icon: "✉️", name: "Email Signatures" },
    { icon: "🎫", name: "ID Cards" },
    { icon: "📁", name: "Document Folders" },
    { icon: "🖨️", name: "Print Specifications" },
  ];
  return (
    <section id="corporate-identity" className="scroll-mt-8">
      <SectionHeading
        num="15"
        title="Corporate Identity System"
        subtitle="Complete corporate identity materials for professional business communication."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <Card key={i.name}>
            <p className="text-2xl">{i.icon}</p>
            <p className="mt-3 text-sm font-medium text-hajr-deep-navy">{i.name}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────  16 — Business Cards  ──────────────────── */

function Section16BusinessCards() {
  return (
    <section id="business-cards" className="scroll-mt-8">
      <SectionHeading
        num="16"
        title="Business Cards"
        subtitle="Horizontal 90×50 mm, vertical 50×90 mm, both with front and back."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <BusinessCardFront />
        <BusinessCardBack />
      </div>
    </section>
  );
}

function BusinessCardFront() {
  return (
    <Card padded={false}>
      <div className="relative aspect-[9/5] p-6">
        <AWatermark position="br" opacity={0.03} size="text-[12rem]" />
        <HajrLogo size="sm" variant="mark" />
        <div className="mt-6">
          <p className="font-semibold text-hajr-deep-navy">Dr. Sarah Al-Hassan</p>
          <p className="text-xs text-hajr-muted">Academic Director</p>
        </div>
        <div className="mt-4 space-y-0.5 text-[11px] text-hajr-body">
          <p className="num">+966 50 123 4567</p>
          <p>sarah@hajracademy.sa</p>
          <p>hajracademy.sa</p>
        </div>
      </div>
      <p className="border-t border-hajr-border px-5 py-2 text-[10px] uppercase tracking-[0.2em] text-hajr-muted">Front</p>
    </Card>
  );
}

function BusinessCardBack() {
  return (
    <Card padded={false} dark>
      <div className="relative flex aspect-[9/5] flex-col items-center justify-center p-6 text-white">
        <span
          className="font-en font-light leading-none"
          style={{ color: "#B86E7B", fontSize: "5rem", fontWeight: 300, letterSpacing: "-0.02em" }}
        >
          A°
        </span>
        <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.4em] text-white/70">
          Gateway to Growth
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/50">
          Al Ahsa, Saudi Arabia
        </p>
      </div>
      <p className="border-t border-white/10 px-5 py-2 text-[10px] uppercase tracking-[0.2em] text-white/60">
        Back
      </p>
    </Card>
  );
}

/* ──────────────────────  17 — Letterhead  ───────────────────── */

function Section17Letterhead() {
  return (
    <section id="letterhead" className="scroll-mt-8">
      <SectionHeading
        num="17"
        title="Official Letterhead"
        subtitle="A4 templates in English and Arabic (RTL)."
      />
      <Card padded={false}>
        <div className="relative aspect-[1/1.414] p-10">
          <AWatermark position="center" opacity={0.02} size="text-[24rem]" />
          <div className="relative">
            <HajrLogo size="md" variant="mark" />
          </div>
          <div className="relative mt-8 flex justify-between text-[11px] text-hajr-muted">
            <span>Ref: HAJR-2026-001</span>
            <span className="num">22 May 2026</span>
          </div>
          <div className="relative mt-6 space-y-2">
            <div className="h-2 w-2/3 rounded bg-hajr-hover" />
            <div className="h-1.5 w-full rounded bg-hajr-hover" />
            <div className="h-1.5 w-11/12 rounded bg-hajr-hover" />
            <div className="h-1.5 w-4/5 rounded bg-hajr-hover" />
          </div>
          <div className="relative mt-12 space-y-1">
            <div className="h-1.5 w-full rounded bg-hajr-hover" />
            <div className="h-1.5 w-10/12 rounded bg-hajr-hover" />
            <div className="h-1.5 w-1/2 rounded bg-hajr-hover" />
          </div>
          <div className="relative mt-10 border-t border-hajr-border pt-3 text-[10px] text-hajr-muted">
            <span>Al Ahsa, Saudi Arabia · +966 11 234 5678 · info@hajracademy.sa · hajracademy.sa</span>
          </div>
        </div>
      </Card>
    </section>
  );
}

/* ──────────────────────  18 — Contracts  ────────────────────── */

function Section18Contracts() {
  const types = [
    ["TA", "Training Agreement"],
    ["SA", "Service Agreement"],
    ["PA", "Partnership Agreement"],
    ["EC", "Employment Contract"],
    ["IA", "Internal Agreement"],
    ["CA", "Confidentiality (NDA)"],
  ];
  return (
    <section id="contracts" className="scroll-mt-8">
      <SectionHeading
        num="18"
        title="Contract Templates"
        subtitle="Cover pages, headers/footers, and signature pages. Subtle A° watermark at 1.5% opacity."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {types.map(([abbr, name]) => (
          <Card key={abbr}>
            <div className="flex items-baseline gap-3">
              <span className="num text-2xl font-semibold text-hajr-rose">{abbr}</span>
              <span className="text-sm font-medium text-hajr-deep-navy">{name}</span>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────  19 — Stamps  ───────────────────────── */

function Section19Stamps() {
  const stamps = ["PAID", "RECEIVED", "APPROVED", "CONFIDENTIAL", "ORIGINAL", "COPY", "FINANCE", "OFFICIAL"];
  return (
    <section id="stamps" className="scroll-mt-8">
      <SectionHeading
        num="19"
        title="Stamp System"
        subtitle="Private educational organisation stamps in round and rectangular formats. No governmental references."
      />
      <Card>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {stamps.map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full border-2 text-xs font-semibold"
                style={{ borderColor: "#1E2A36", color: "#1E2A36" }}
              >
                {s}
              </div>
              <p className="num text-[10px] text-hajr-muted">Round 50mm</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

/* ──────────────────────  20 — Email Signatures  ────────────── */

function Section20EmailSignatures() {
  const sigs = [
    { tier: "Executive", name: "Dr. Ahmad Al-Mansour", title: "Chief Executive Officer" },
    { tier: "Academic",  name: "Sarah Al-Hassan, PhD", title: "Academic Director · IELTS Specialist" },
    { tier: "Staff",     name: "Mohammed Al-Qahtani",  title: "Student Services Coordinator" },
  ];
  return (
    <section id="email-signatures" className="scroll-mt-8">
      <SectionHeading
        num="20"
        title="Email Signatures"
        subtitle="Three tiers for executive, academic, and general staff. HTML table format for email-client compatibility."
      />
      <div className="space-y-4">
        {sigs.map((s) => (
          <Card key={s.tier}>
            <SubLabel>{s.tier}</SubLabel>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4 border-s-2 border-hajr-rose ps-4">
              <div>
                <HajrLogo size="sm" variant="mark" />
                <p className="mt-3 font-semibold text-hajr-deep-navy">{s.name}</p>
                <p className="text-xs text-hajr-rose">{s.title}</p>
              </div>
              <div className="text-[11px] text-hajr-muted">
                <p>📞 +966 11 234 5678</p>
                <p>📧 staff@hajracademy.sa</p>
                <p>🌐 hajracademy.sa</p>
                <p>📍 Al Ahsa, Saudi Arabia</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────  21 — ID Cards  ─────────────────────── */

function Section21IDCards() {
  return (
    <section id="id-cards" className="scroll-mt-8">
      <SectionHeading
        num="21"
        title="ID Card System"
        subtitle="Minimal, clean, and premium 85.6×54 mm CR80 cards for employees and students."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card padded={false}>
          <div className="aspect-[1.585/1] p-5">
            <HajrLogo size="sm" variant="mark" />
            <div className="mt-3 flex gap-4">
              <div className="h-16 w-16 rounded-md bg-hajr-hover" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-hajr-deep-navy">Sarah Al-Hassan</p>
                <p className="text-[10px] text-hajr-muted">Academic Director</p>
                <p className="num mt-2 text-[10px] text-hajr-muted">EMP-2026-0042</p>
              </div>
              <div className="h-12 w-12 rounded bg-hajr-deep-navy" />
            </div>
          </div>
          <p className="border-t border-hajr-border px-5 py-2 text-[10px] uppercase tracking-[0.2em] text-hajr-muted">
            Employee · Front
          </p>
        </Card>
        <Card padded={false} dark>
          <div className="relative flex aspect-[1.585/1] items-center justify-center p-5">
            <AWatermark color="#FAF6EE" opacity={0.06} size="text-[10rem]" position="center" />
            <HajrLogo size="sm" variant="mark" light />
          </div>
          <p className="border-t border-white/10 px-5 py-2 text-[10px] uppercase tracking-[0.2em] text-white/60">
            Employee · Back
          </p>
        </Card>
      </div>
    </section>
  );
}

/* ──────────────────────  22 — Folders  ──────────────────────── */

function Section22Folders() {
  const folders = [
    { name: "Presentation Folder", spec: "220×310 mm · 350gsm · matte lamination · 2 pockets" },
    { name: "Proposal Folder",     spec: "220×310 mm · 300gsm · spot UV on logo · 1 pocket + card slot" },
    { name: "Student File Folder", spec: "240×320 mm · 250gsm · wipe-clean · multi-divider" },
  ];
  return (
    <section id="folders" className="scroll-mt-8">
      <SectionHeading
        num="22"
        title="Document Folders"
        subtitle="Presentation, proposal, and student-file folder designs."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {folders.map((f) => (
          <Card key={f.name}>
            <p className="font-medium text-hajr-deep-navy">{f.name}</p>
            <p className="num mt-2 text-xs text-hajr-muted">{f.spec}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────  23 — Photography  ──────────────────── */

function Section23Photography() {
  const principles = [
    ["📸", "Authentic & Real", "Capture genuine moments of learning, interaction, and growth."],
    ["⭐", "Premium Quality",   "High-resolution images with professional composition and lighting."],
    ["🇸🇦", "Saudi Cultural Context", "Represent Saudi students and cultural values authentically."],
    ["🎓", "Educational Focus", "Learning environments, engaged students, modern facilities."],
  ];
  return (
    <section id="photography" className="scroll-mt-8">
      <SectionHeading
        num="23"
        title="Photography Style Guide"
        subtitle="Professional photography guidelines for authentic, premium educational imagery."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {principles.map(([icon, t, body]) => (
          <Card key={t}>
            <p className="text-2xl">{icon}</p>
            <p className="mt-3 text-sm font-medium text-hajr-deep-navy">{t}</p>
            <p className="mt-2 text-xs text-hajr-body">{body}</p>
          </Card>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <SubLabel>Do</SubLabel>
          <ul className="mt-3 space-y-1.5 text-sm text-hajr-body">
            <li>✓ Students actively engaged in learning</li>
            <li>✓ Genuine expressions of focus and growth</li>
            <li>✓ Diverse age groups and backgrounds</li>
            <li>✓ Natural soft lighting, warm tones</li>
          </ul>
        </Card>
        <Card>
          <SubLabel>Don't</SubLabel>
          <ul className="mt-3 space-y-1.5 text-sm text-hajr-body">
            <li>× Overly staged or artificial poses</li>
            <li>× Exaggerated stock-imagery expressions</li>
            <li>× Messy or unprofessional environments</li>
            <li>× Heavy filters or extreme contrast</li>
          </ul>
        </Card>
      </div>
    </section>
  );
}

/* ──────────────────────  24 — AI Prompts  ───────────────────── */

function Section24AIPrompts() {
  const categories = [
    "Course Posters",
    "Student Images",
    "Social Media Posts",
    "Video Ads",
    "Website Banners",
    "Offers / Discounts",
    "Educational Content",
    "Campaigns",
  ];
  return (
    <section id="ai-prompts" className="scroll-mt-8">
      <SectionHeading
        num="24"
        title="AI Prompt Library"
        subtitle="Ready-to-use AI prompts for generating brand-consistent content. Always include brand name, location, palette, and Saudi cultural context."
      />
      <Card>
        <SubLabel>Always Include in Prompts</SubLabel>
        <ul className="mt-3 grid gap-2 text-sm text-hajr-body sm:grid-cols-2">
          <li>Brand Name — "HAJR A° Academy"</li>
          <li>Location — "Al Ahsa, Saudi Arabia"</li>
          <li>Colors — Deep Navy #1E2A36, Rose Mauve #B86E7B, Mint #B5E5D8</li>
          <li>Style — "Modern minimal", "Premium educational", "Professional"</li>
          <li>Context — "English language education", "Saudi students"</li>
        </ul>
      </Card>
      <Card className="mt-4">
        <SubLabel>Prompt Categories</SubLabel>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {categories.map((c) => (
            <div key={c} className="rounded-lg border border-hajr-border bg-hajr-ivory p-3 text-xs text-hajr-body">
              {c}
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

/* ──────────────────────  25 — Downloads  ────────────────────── */

function Section25Downloads() {
  const packs = [
    { name: "Logo Package", note: "SVG · PNG · AI · EPS · PDF" },
    { name: "Design Tokens", note: "CSS variables · JSON · Tailwind config" },
    { name: "Icon Library", note: "24 educational + 9 social icons" },
    { name: "Social Templates", note: "1080×1080 + 1080×1920" },
    { name: "PowerPoint Masters", note: "16:9 · 8 layouts" },
    { name: "Print Stationery", note: "Business cards · letterhead · folders" },
  ];
  return (
    <section id="downloads" className="scroll-mt-8">
      <SectionHeading
        num="25"
        title="Downloads &amp; Resources"
        subtitle="Logo files, design assets, and templates for immediate use."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packs.map((p) => (
          <Card key={p.name}>
            <p className="font-medium text-hajr-deep-navy">{p.name}</p>
            <p className="mt-1 text-xs text-hajr-muted">{p.note}</p>
            <button
              type="button"
              className="mt-4 inline-flex w-full justify-center rounded-lg border border-hajr-navy bg-transparent px-4 py-2 text-xs font-medium text-hajr-navy hover:bg-hajr-navy/5"
              disabled
            >
              Coming soon
            </button>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="mt-20 border-t border-hajr-border pt-8 text-center">
      <HajrLogo size="sm" variant="mark" />
      <p className="mt-4 text-[11px] text-hajr-muted">
        {BRAND.name.en} · Brand Book v1.0 · 2026 ·{" "}
        <span className="num">{BRAND.contact.city}</span>
      </p>
    </footer>
  );
}
