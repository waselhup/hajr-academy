"use client";

import { useEffect, useState } from "react";
import s from "./early-registration.module.css";

/**
 * The three interactive pieces of the campaign page. Everything else is
 * server-rendered, so the page is complete and indexable without JS.
 */

/* ── Sticky offer bar + countdown ──────────────────────────────────────
 * The countdown is client-only on purpose: rendering a live duration on the
 * server guarantees a hydration mismatch, because the two clocks differ by
 * the length of the request. The bar itself renders server-side with the
 * end date, and the ticker fills in afterwards.
 */
export function OfferBar({
  endsIso,
  save,
  pct,
  ends,
  claim,
  ended,
  dayWord,
  hourWord,
}: {
  endsIso: string;
  save: string;
  pct: string;
  ends: string;
  claim: string;
  ended: string;
  dayWord: string;
  hourWord: string;
}) {
  const [label, setLabel] = useState<string | null>(null);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const target = new Date(endsIso).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setIsOver(true);
        setLabel(ended);
        return;
      }
      const days = Math.floor(diff / 86_400_000);
      const hours = Math.floor((diff % 86_400_000) / 3_600_000);
      setLabel(`${days} ${dayWord} ${hours} ${hourWord}`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [endsIso, ended, dayWord, hourWord]);

  return (
    <div className={s.offerBar} role="status">
      {/* Once the deadline passes the page must stop claiming a discount that
          is no longer live — the prices themselves come from the catalogue. */}
      {!isOver && (
        <strong>
          {save} <span className={s.latin}>{pct}</span>
        </strong>
      )}
      <span className={s.offerEnd}>{isOver ? ended : ends}</span>
      {label && !isOver && <span className={s.countdown}>{label}</span>}
      <a href="#early-pricing">{claim}</a>
    </div>
  );
}

/* ── Navigation with the mobile drawer ─────────────────────────────── */
export function SiteNav({
  ariaLabel,
  brandAria,
  menuAria,
  links,
  enrollLabel,
  enrollHref,
  languageHref,
  languageCode,
  languageAria,
}: {
  ariaLabel: string;
  brandAria: string;
  menuAria: string;
  links: { href: string; label: string }[];
  enrollLabel: string;
  enrollHref: string;
  languageHref: string;
  languageCode: string;
  languageAria: string;
}) {
  const [open, setOpen] = useState(false);

  // Lock the page behind the drawer. Set inline rather than via a global
  // class, so the module stays fully scoped; the previous value is restored
  // so the page is never left unscrollable if the user navigates mid-open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = previous === "hidden" ? "" : previous;
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <nav className={s.nav} aria-label={ariaLabel}>
      <div className={`${s.container} ${s.navInner}`}>
        <a className={s.brand} href="#top" aria-label={brandAria}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/logo-transparent-white.png" alt="HAJR A° Academy" width={150} height={40} />
        </a>
        <div className={`${s.navLinks} ${open ? s.open : ""}`} id="erNavLinks">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
        </div>
        <div className={s.navActions}>
          <a className={s.languageSwitch} href={languageHref} aria-label={languageAria} hrefLang={languageCode.toLowerCase()}>
            {languageCode}
          </a>
          <a className={`${s.btn} ${s.btnRose} ${s.btnSmall}`} href={enrollHref}>
            {enrollLabel}
          </a>
          <button
            className={s.menuButton}
            type="button"
            aria-label={menuAria}
            aria-controls="erNavLinks"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ── Programme tabs ────────────────────────────────────────────────── */
export interface TabCard {
  slug: string;
  tag: string;
  title: string;
  titleLatin?: boolean;
  desc: string;
  price: string;
  unit: string;
  features: string[];
  cta: string;
  href: string;
  rose?: boolean;
}

export interface Tab {
  id: string;
  label: string;
  heading: string;
  sub: string;
  wide?: boolean;
  cards: TabCard[];
}

export function ProgramTabs({ tabs, tablistAria }: { tabs: Tab[]; tablistAria: string }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  // Roving arrow-key navigation, mirrored for RTL so "next" means the tab the
  // user sees to the side they pressed.
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const rtl = document.documentElement.dir === "rtl";
    const step = e.key === "ArrowRight" ? (rtl ? -1 : 1) : rtl ? 1 : -1;
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? tabs.length - 1
          : (index + step + tabs.length) % tabs.length;
    setActive(tabs[next].id);
    document.getElementById(`ertab-${tabs[next].id}`)?.focus();
  }

  return (
    <>
      <div className={s.programTabs} role="tablist" aria-label={tablistAria}>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            id={`ertab-${t.id}`}
            className={s.programTab}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            aria-controls={t.id}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tabs.map((t) => (
        <div
          key={t.id}
          className={s.programPanel}
          id={t.id}
          role="tabpanel"
          aria-labelledby={`ertab-${t.id}`}
          hidden={active !== t.id}
        >
          <div className={s.groupHead}>
            <div>
              <h3>{t.heading}</h3>
              <p>{t.sub}</p>
            </div>
          </div>
          <div className={`${s.programGrid} ${t.wide ? s.four : ""}`}>
            {t.cards.map((c) => (
              <article className={s.programCard} key={c.slug}>
                <span className={s.programTag}>{c.tag}</span>
                <h4 className={c.titleLatin ? s.latin : undefined}>{c.title}</h4>
                <p>{c.desc}</p>
                <div className={s.programPrice}>
                  <strong>{c.price}</strong>
                  <span>{c.unit}</span>
                </div>
                <ul className={s.programFeatures}>
                  {c.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <a
                  className={`${s.btn} ${c.rose ? s.btnRose : s.btnDark} ${s.btnBlock}`}
                  href={c.href}
                  data-plan={c.slug}
                >
                  {c.cta}
                </a>
              </article>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Smooth in-page scrolling, for this route only.
 *
 * The clearance under the sticky header is handled in CSS by scroll-margin on
 * the sections themselves. Only the scroll BEHAVIOUR has to live on <html>,
 * so it is set inline and reverted on unmount — and skipped entirely for
 * anyone who asked for reduced motion.
 */
export function ScrollOffset() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = previous;
    };
  }, []);
  return null;
}
