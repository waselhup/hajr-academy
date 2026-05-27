/**
 * PDF version of the client presentation — print-optimised HTML with
 * one A4 landscape "slide" per page. Mirrors brand-book pattern.
 */
import { BRAND } from "@/lib/brand";
import type { DeliveryStats } from "./stats";

const C = BRAND.palette;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface SprintEntry {
  num: number;
  title: string;
  bullets: string[];
  stat: { label: string; value: string };
}

function entries(stats: DeliveryStats): SprintEntry[] {
  return [
    {
      num: 1,
      title: "Foundations — Auth, Calendar, Notifications",
      bullets: [
        "Multi-role auth + RBAC across 6 roles",
        "Unified CalendarEvent system",
        "Cron infrastructure + notify primitive",
      ],
      stat: { label: "Class sessions tracked", value: String(stats.sessions) },
    },
    {
      num: 2,
      title: "Marketing, Affiliates, Placement",
      bullets: [
        "Marketer role + referral codes",
        "Commission engine + payouts",
        "Placement test with CEFR mapping",
      ],
      stat: {
        label: "Approved commissions (SAR)",
        value: stats.commissionsApprovedSar.toLocaleString(),
      },
    },
    {
      num: 3,
      title: "Tickets, Teacher Profiles, Meetings",
      bullets: [
        "Ticketing with SLA + Claude triage",
        "Public teacher profiles + ratings",
        "Monthly teacher meetings + RSVP",
      ],
      stat: { label: "Tickets opened", value: String(stats.tickets) },
    },
    {
      num: 4,
      title: "Parent Reports, Certificates, Payouts",
      bullets: [
        "Monthly parent PDF reports + share image",
        "QR-verifiable certificates",
        "Self-service payment requests",
      ],
      stat: { label: "Certificates issued", value: String(stats.certificates) },
    },
    {
      num: 5,
      title: "AI Polish, Brand, Handover",
      bullets: [
        "Auto AI lesson summaries (Claude Haiku)",
        "Brand Book PDF + asset library",
        "Validation Mode + auto presentation",
      ],
      stat: { label: "AI lesson summaries", value: String(stats.lessonSummaries) },
    },
  ];
}

export function generatePresentationPdf(stats: DeliveryStats): Buffer {
  const sprints = entries(stats);
  const today = new Date().toISOString().slice(0, 10);
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <title>${esc(BRAND.name.en)} — Platform v2.0</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; font-family: Inter, sans-serif; color: ${C.deepNavy}; }
    .slide {
      width: 297mm; height: 210mm; padding: 18mm;
      page-break-after: always; position: relative;
      background: ${C.ivory};
    }
    .slide:last-child { page-break-after: auto; }
    .cover { background: ${C.deepNavy}; color: #fff; display: flex; flex-direction: column; justify-content: center; }
    .cover h1 { font-size: 88pt; margin: 0; }
    .cover .accent { color: ${C.rose}; }
    .cover .tagline { color: ${C.mint}; font-size: 24pt; margin-top: 6mm; }
    h2 { font-size: 32pt; margin: 0 0 8mm; color: ${C.deepNavy}; }
    .row { display: grid; grid-template-columns: 2fr 1fr; gap: 10mm; align-items: center; }
    ul { font-size: 16pt; line-height: 1.8; padding-inline-start: 24px; }
    .stat-card { background: #fff; border: 3px solid ${C.mint}; border-radius: 8mm; padding: 8mm; text-align: center; }
    .stat-card .num { font-size: 64pt; font-weight: 800; color: ${C.rose}; }
    .stat-card .lbl { color: ${C.navy}; font-size: 14pt; margin-top: 4mm; }
    .header-strip { background: ${C.deepNavy}; color: #fff; padding: 6mm 10mm; margin: -18mm -18mm 10mm; border-radius: 0; }
    .header-strip .sprintnum { color: ${C.mint}; font-size: 14pt; font-weight: 700; }
    .header-strip h2 { color: #fff; font-size: 28pt; margin: 2mm 0 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6mm; }
    .tile { background: #fff; border: 2px solid ${C.mint}; border-radius: 6mm; padding: 6mm; text-align: center; }
    .tile .v { font-size: 28pt; font-weight: 800; color: ${C.rose}; }
    .tile .l { font-size: 11pt; color: ${C.textMuted}; margin-top: 2mm; }
    .journey { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6mm; margin-top: 20mm; align-items: center; }
    .step { text-align: center; }
    .step .dot { width: 18mm; height: 18mm; border-radius: 50%; background: ${C.rose}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24pt; font-weight: 800; margin: 0 auto 4mm; }
  </style></head>
  <body>

  <section class="slide cover">
    <div style="font-size:14pt;color:${C.mint};">Final Delivery · ${today}</div>
    <h1>HAJR <span class="accent">A°</span></h1>
    <div class="tagline">Platform v2.0 — 5 sprints, built with care</div>
  </section>

  <section class="slide">
    <h2>The 5-sprint journey</h2>
    <div class="journey">
      ${["Foundations","Marketing","Tickets","Reports","AI & Handover"].map((label,i)=>`
        <div class="step">
          <div class="dot">${i+1}</div>
          <div style="font-size:13pt;color:${C.deepNavy};font-weight:600;">${esc(label)}</div>
        </div>
      `).join("")}
    </div>
  </section>

  ${sprints.map(e=>`
    <section class="slide">
      <div class="header-strip">
        <div class="sprintnum">Sprint ${e.num}</div>
        <h2>${esc(e.title)}</h2>
      </div>
      <div class="row">
        <ul>${e.bullets.map(b=>`<li>${esc(b)}</li>`).join("")}</ul>
        <div class="stat-card">
          <div class="num">${esc(e.stat.value)}</div>
          <div class="lbl">${esc(e.stat.label)}</div>
        </div>
      </div>
    </section>
  `).join("")}

  <section class="slide">
    <h2>Live platform stats</h2>
    <div class="stats-grid">
      ${[
        ["Students", stats.students],
        ["Teachers", stats.teachers],
        ["Parents", stats.parents],
        ["Marketers", stats.marketers],
        ["Classes", stats.classes],
        ["Sessions", stats.sessions],
        ["Recordings", stats.recordings],
        ["AI summaries", stats.lessonSummaries],
        ["Tickets", stats.tickets],
        ["Certificates", stats.certificates],
        ["Parent reports", stats.parentReports],
        ["Approved SAR", stats.commissionsApprovedSar.toLocaleString()],
      ].map(([l,v])=>`<div class="tile"><div class="v">${esc(String(v))}</div><div class="l">${esc(String(l))}</div></div>`).join("")}
    </div>
  </section>

  <section class="slide">
    <h2>What's next — Phase 3 roadmap</h2>
    <ul>
      <li>Mobile companion app (Capacitor / Expo)</li>
      <li>Advanced analytics: cohort retention, LTV by source</li>
      <li>Teacher marketplace — outside hires + reviews</li>
      <li>WhatsApp Business API direct</li>
      <li>ZATCA Phase 2 e-invoicing</li>
      <li>GCC expansion — UAE + Kuwait white-label</li>
    </ul>
  </section>

  <section class="slide cover" style="background:${C.deepNavy};color:#fff;text-align:center;">
    <div style="margin:auto;">
      <h1 style="font-size:96pt;">Thank you</h1>
      <div class="tagline">${esc(BRAND.tagline.en)} · ${esc(BRAND.tagline.ar)}</div>
      <div style="margin-top:30mm;color:${C.mint};font-size:14pt;">${esc(BRAND.contact.email)}</div>
    </div>
  </section>

  </body></html>`;
  return Buffer.from(html, "utf8");
}
