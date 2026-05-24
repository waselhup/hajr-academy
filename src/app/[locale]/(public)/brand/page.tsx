import type { Metadata } from "next";
import { HajrLogo } from "@/components/brand/logo";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Brand Identity — HAJR A° Academy",
  description: "The official HAJR A° brand v3 — locked palette, logo lockups, stationery and social tile examples.",
};

/**
 * /brand — public brand showcase. Mirrors the locked official brand
 * reference: logo variations grid, 70/15/10/3/2 colour hierarchy,
 * primary logo on light + dark, business card / letterhead, and
 * social media tile examples. Use this page to verify the logo
 * proportions and palette across surfaces.
 */
export default function BrandShowcasePage() {
  const C = BRAND.palette;

  return (
    <div className="min-h-screen bg-hajr-ivory pb-24">
      {/* Page header */}
      <header className="border-b border-hajr-border bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
          <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-hajr-muted">
            Brand Identity · v3
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-hajr-deep-navy sm:text-4xl">
            HAJR A° Academy
          </h1>
          <p className="mt-2 text-sm text-hajr-body">
            Locked official brand. Proportion rule 70 / 15 / 10 / 3 / 2 — rose mauve is accent only.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-16 px-6 pt-12 sm:pt-16">
        {/* ── Primary Logo ────────────────────────────────────── */}
        <section>
          <SectionLabel>Primary Logo</SectionLabel>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="flex aspect-[16/9] items-center justify-center rounded-2xl border border-hajr-border bg-white">
              <HajrLogo size="xl" variant="full" />
            </div>
            <div className="flex aspect-[16/9] items-center justify-center rounded-2xl bg-hajr-deep-navy">
              <HajrLogo size="xl" variant="full" light />
            </div>
          </div>
        </section>

        {/* ── Color Hierarchy ─────────────────────────────────── */}
        <section>
          <SectionLabel>Color Hierarchy</SectionLabel>
          <div className="mt-5 overflow-hidden rounded-2xl bg-white p-6 shadow-sm">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <Swatch name="Deep Navy" hex={C.deepNavy} note="70% — Primary" />
              <Swatch name="Charcoal Navy" hex={C.navy} note="15% — Secondary" />
              <Swatch name="Ivory Silk" hex={C.ivory} note="10% — Background" />
              <Swatch name="Rose Mauve" hex={C.rose} note="3% — Accent Only" />
              <Swatch name="Mint Frost" hex={C.mint} note="2% — Support" />
            </div>
          </div>
        </section>

        {/* ── Logo Variations ─────────────────────────────────── */}
        <section>
          <SectionLabel>Logo Variations</SectionLabel>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Tile>
              <HajrLogo size="lg" variant="mark" />
            </Tile>
            <Tile>
              <span className="inline-flex items-baseline leading-none font-en">
                <span className="text-3xl font-semibold tracking-tight text-hajr-rose">
                  A
                </span>
                <span
                  className="self-start text-xl font-medium leading-none text-hajr-rose"
                  style={{ transform: "translateY(-0.05em)" }}
                >
                  °
                </span>
              </span>
            </Tile>
            <Tile dark>
              <HajrLogo size="xl" variant="app-icon" />
            </Tile>
            <Tile>
              <span className="inline-flex items-baseline leading-none font-en">
                <span className="text-3xl font-semibold tracking-tight text-hajr-rose">
                  A
                </span>
                <span
                  className="self-start text-xl font-medium leading-none text-hajr-rose"
                  style={{ transform: "translateY(-0.05em)" }}
                >
                  °
                </span>
              </span>
            </Tile>
          </div>
        </section>

        {/* ── Social Media Examples ───────────────────────────── */}
        <section>
          <SectionLabel>Social Media Examples</SectionLabel>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <SocialTile
              header="HAJR A°"
              title="Transform Your Future"
              subtitle="Join Saudi Arabia's premier educational institution"
              tag="LINKEDIN"
            />
            <SocialTile
              header="HAJR A°"
              title="Excellence in Education"
              subtitle="Timeless learning for modern minds"
              tag="TWITTER / X"
            />
          </div>
        </section>

        {/* ── Stationery System ───────────────────────────────── */}
        <section>
          <SectionLabel>Stationery System</SectionLabel>
          <div className="mt-5 grid gap-5 md:grid-cols-[1fr_2fr]">
            {/* Business card */}
            <div className="relative overflow-hidden rounded-2xl bg-white p-7 shadow-md ring-1 ring-hajr-border">
              {/* Decorative ghost A° */}
              <span
                aria-hidden
                className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 select-none opacity-[0.05]"
              >
                <span className="inline-flex items-baseline font-en text-[8rem] leading-none">
                  <span className="font-semibold tracking-tight text-hajr-deep-navy">A</span>
                  <span
                    className="self-start font-medium leading-none"
                    style={{ transform: "translateY(-0.05em)", fontSize: "0.55em" }}
                  >
                    °
                  </span>
                </span>
              </span>
              <HajrLogo size="md" variant="mark" />
              <div className="mt-8 space-y-1">
                <p className="text-base font-bold text-hajr-deep-navy">Dr. Sarah Al-Hassan</p>
                <p className="text-xs text-hajr-muted">Academic Director</p>
              </div>
              <div className="mt-6 space-y-1 text-xs text-hajr-body">
                <p>sarah@hajracademy.sa</p>
                <p className="num">+966 50 123 4567</p>
              </div>
              {/* Right edge accent strip */}
              <span
                aria-hidden
                className="absolute end-12 top-7 bottom-7 w-px bg-hajr-rose/40"
              />
            </div>

            {/* Letterhead */}
            <div className="relative overflow-hidden rounded-2xl bg-white p-9 shadow-md ring-1 ring-hajr-border">
              <span
                aria-hidden
                className="pointer-events-none absolute end-6 bottom-12 select-none opacity-[0.06]"
              >
                <span className="inline-flex items-baseline font-en text-[12rem] leading-none">
                  <span className="font-semibold tracking-tight text-hajr-deep-navy">A</span>
                  <span
                    className="self-start font-medium leading-none"
                    style={{ transform: "translateY(-0.05em)", fontSize: "0.55em" }}
                  >
                    °
                  </span>
                </span>
              </span>
              <HajrLogo size="md" variant="mark" />
              <div className="mt-12 space-y-3">
                <div className="h-2 w-2/3 rounded bg-hajr-border" />
                <div className="space-y-2">
                  <div className="h-1.5 w-full rounded bg-hajr-border" />
                  <div className="h-1.5 w-11/12 rounded bg-hajr-border" />
                  <div className="h-1.5 w-3/5 rounded bg-hajr-border" />
                </div>
                <div className="space-y-2 pt-3">
                  <div className="h-1.5 w-full rounded bg-hajr-border" />
                  <div className="h-1.5 w-10/12 rounded bg-hajr-border" />
                  <div className="h-1.5 w-4/5 rounded bg-hajr-border" />
                </div>
              </div>
              <div className="mt-12 border-t border-hajr-border pt-3 text-[11px] text-hajr-muted">
                <span className="num">Riyadh, Saudi Arabia · info@hajracademy.sa · www.hajracademy.sa</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Typography ──────────────────────────────────────── */}
        <section>
          <SectionLabel>Typography</SectionLabel>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-7 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.32em] text-hajr-muted">English</p>
              <p className="mt-3 text-5xl font-extrabold tracking-tight text-hajr-deep-navy">
                Inter
              </p>
              <p className="mt-4 text-sm text-hajr-body">
                Headings: condensed, tight tracking (-0.02em). Body text:
                regular weight, comfortable line-height. Numerals use
                tabular figures via the <code className="rounded bg-hajr-hover px-1.5 py-0.5 text-xs">.num</code> utility.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-7 shadow-sm" dir="rtl">
              <p className="text-[10px] uppercase tracking-[0.32em] text-hajr-muted">العربية</p>
              <p className="mt-3 text-5xl font-extrabold tracking-tight text-hajr-deep-navy">
                IBM Plex Sans Arabic
              </p>
              <p className="mt-4 text-sm text-hajr-body">
                خط رئيسي للنصوص العربية. ينسجم بصرياً مع Inter في الإنجليزية
                ويحافظ على نفس الإحساس الراقي في جميع المنصات.
              </p>
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer className="border-t border-hajr-border pt-8 text-center">
          <p className="text-xs text-hajr-muted">
            HAJR A° Academy · Brand v3 · Locked {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-medium uppercase tracking-[0.32em] text-hajr-muted">
      {children}
    </h2>
  );
}

function Swatch({ name, hex, note }: { name: string; hex: string; note: string }) {
  return (
    <div>
      <div
        className="h-32 rounded-xl border border-hajr-border"
        style={{ background: hex }}
      />
      <div className="mt-3">
        <p className="text-sm font-semibold text-hajr-deep-navy">{name}</p>
        <p className="num text-xs text-hajr-muted">{hex}</p>
        <p className="mt-1 text-[11px] text-hajr-muted">{note}</p>
      </div>
    </div>
  );
}

function Tile({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={
        "flex aspect-[4/3] items-center justify-center rounded-2xl " +
        (dark ? "bg-hajr-deep-navy" : "bg-white border border-hajr-border")
      }
    >
      {children}
    </div>
  );
}

function SocialTile({
  header,
  title,
  subtitle,
  tag,
}: {
  header: string;
  title: string;
  subtitle: string;
  tag: string;
}) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-hajr-deep-navy p-7 text-white sm:p-9">
      {/* Decorative ghost A° */}
      <span
        aria-hidden
        className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 select-none opacity-10"
      >
        <span className="inline-flex items-baseline font-en text-[10rem] leading-none">
          <span className="font-semibold tracking-tight text-white">A</span>
          <span
            className="self-start font-medium leading-none"
            style={{ transform: "translateY(-0.05em)", fontSize: "0.55em" }}
          >
            °
          </span>
        </span>
      </span>

      {/* Header lockup */}
      <div className="flex items-baseline gap-1.5 font-en">
        <span className="text-xl font-extrabold tracking-tighter text-white">
          {header.split(" ")[0]}
        </span>
        <span className="inline-flex items-baseline leading-none">
          <span className="text-[0.6rem] font-semibold tracking-tight text-hajr-rose">
            A
          </span>
          <span
            className="self-start text-[0.4rem] font-medium leading-none text-hajr-rose"
            style={{ transform: "translateY(-0.05em)" }}
          >
            °
          </span>
        </span>
      </div>

      {/* Body */}
      <div className="absolute inset-x-7 bottom-7 sm:inset-x-9 sm:bottom-9">
        <h3 className="text-2xl font-bold text-white">{title}</h3>
        <p className="mt-1 text-sm text-white/70">{subtitle}</p>
        <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-hajr-rose">
          ● {tag}
        </p>
      </div>
    </div>
  );
}
