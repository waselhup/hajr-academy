/**
 * Auto-generate the client handover PPTX deck using pptxgenjs.
 * Returns a Node Buffer ready to stream as a download.
 */
import PptxGenJs from "pptxgenjs";
import { BRAND } from "@/lib/brand";
import type { DeliveryStats } from "./stats";

const NAVY = BRAND.palette.deepNavy.replace("#", "");
const ROSE = BRAND.palette.rose.replace("#", "");
const MINT = BRAND.palette.mint.replace("#", "");
const IVORY = BRAND.palette.ivory.replace("#", "");
const WHITE = "FFFFFF";

interface SprintEntry {
  num: number;
  title: string;
  bullets: string[];
  stat: { label: string; value: string };
}

function sprintEntries(stats: DeliveryStats): SprintEntry[] {
  return [
    {
      num: 1,
      title: "Foundations — Auth, Calendar, Notifications",
      bullets: [
        "Multi-role auth + RBAC across 6 roles",
        "Unified CalendarEvent system across roles",
        "Cron infrastructure (5-min ticks)",
        "Notify primitive (in-app + email + SMS)",
      ],
      stat: { label: "Class sessions tracked", value: String(stats.sessions) },
    },
    {
      num: 2,
      title: "Marketing, Affiliates, Placement",
      bullets: [
        "Marketer role with referral codes",
        "Commission engine + payouts",
        "Placement test with auto-scoring + CEFR mapping",
        "Lead pipeline (NEW → CONTACTED → CONVERTED)",
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
        "Ticketing with SLA + auto-triage (Claude)",
        "Public teacher profiles + ratings",
        "Monthly teacher meetings + RSVP",
        "Speaking Club groundwork",
      ],
      stat: { label: "Tickets opened", value: String(stats.tickets) },
    },
    {
      num: 4,
      title: "Parent Reports, Certificates, Payouts",
      bullets: [
        "Monthly parent PDF reports + WhatsApp share image",
        "QR-verifiable certificates",
        "Self-service payment requests (teachers + marketers)",
        "Speaking Club end-to-end",
      ],
      stat: { label: "Certificates issued", value: String(stats.certificates) },
    },
    {
      num: 5,
      title: "AI Polish, Brand, Handover",
      bullets: [
        "Auto AI lesson summaries (Claude Haiku) per session",
        "Brand Book PDF + asset library",
        "Teacher Validation Mode (pre-meeting tool)",
        "Auto-generated client presentation (this deck)",
      ],
      stat: { label: "AI lesson summaries", value: String(stats.lessonSummaries) },
    },
  ];
}

function applyTheme(pres: PptxGenJs) {
  pres.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
  pres.layout = "WIDE";
  pres.title = `${BRAND.name.en} — Platform v2.0`;
  pres.author = BRAND.name.en;
  pres.company = BRAND.name.en;
}

function addCoverSlide(pres: PptxGenJs) {
  const s = pres.addSlide();
  s.background = { color: NAVY };
  s.addText("HAJR A°", {
    x: 0.6, y: 1.2, w: 12, h: 1.6,
    fontFace: "Inter", fontSize: 96, bold: true, color: WHITE,
  });
  s.addText("Platform v2.0 — Final Delivery", {
    x: 0.6, y: 3.0, w: 12, h: 0.8,
    fontFace: "Inter", fontSize: 28, color: MINT,
  });
  s.addText(`5 sprints · Built with care · ${new Date().toISOString().slice(0, 10)}`, {
    x: 0.6, y: 6.6, w: 12, h: 0.4,
    fontFace: "Inter", fontSize: 12, color: MINT,
  });
}

function addJourneySlide(pres: PptxGenJs) {
  const s = pres.addSlide();
  s.background = { color: IVORY };
  s.addText("The 5-sprint journey", {
    x: 0.6, y: 0.4, w: 12, h: 0.8,
    fontFace: "Inter", fontSize: 28, bold: true, color: NAVY,
  });
  const sprints = [
    "1 · Foundations",
    "2 · Marketing & Placement",
    "3 · Tickets & Teachers",
    "4 · Reports & Certificates",
    "5 · AI & Handover",
  ];
  const segW = 2.4;
  sprints.forEach((label, i) => {
    s.addShape("ellipse", {
      x: 0.8 + i * 2.5, y: 3.0, w: 0.8, h: 0.8,
      fill: { color: i < sprints.length ? ROSE : MINT },
      line: { color: NAVY, width: 1 },
    });
    s.addText(String(i + 1), {
      x: 0.8 + i * 2.5, y: 3.0, w: 0.8, h: 0.8,
      align: "center", valign: "middle",
      fontFace: "Inter", fontSize: 24, bold: true, color: WHITE,
    });
    s.addText(label, {
      x: 0.2 + i * 2.5, y: 4.0, w: segW, h: 0.6,
      align: "center",
      fontFace: "Inter", fontSize: 12, color: NAVY,
    });
  });
  // Connecting line
  s.addShape("line", {
    x: 0.9, y: 3.4, w: 11.6, h: 0,
    line: { color: NAVY, width: 2 },
  });
}

function addSprintSlide(pres: PptxGenJs, e: SprintEntry) {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  s.addShape("rect", {
    x: 0, y: 0, w: 13.333, h: 1.0,
    fill: { color: NAVY }, line: { color: NAVY },
  });
  s.addText(`Sprint ${e.num}`, {
    x: 0.6, y: 0.15, w: 2, h: 0.7,
    fontFace: "Inter", fontSize: 18, bold: true, color: MINT,
  });
  s.addText(e.title, {
    x: 2.5, y: 0.15, w: 10.6, h: 0.7,
    fontFace: "Inter", fontSize: 22, bold: true, color: WHITE,
  });
  // Bullets
  s.addText(
    e.bullets.map((b) => ({ text: b, options: { bullet: { code: "25A0" } } })),
    {
      x: 0.7, y: 1.6, w: 8.0, h: 4.4,
      fontFace: "Inter", fontSize: 18, color: NAVY,
      paraSpaceAfter: 8,
    }
  );
  // Stat card
  s.addShape("roundRect", {
    x: 9.2, y: 2.0, w: 3.6, h: 3.0,
    fill: { color: IVORY }, line: { color: MINT, width: 2 }, rectRadius: 0.2,
  });
  s.addText(e.stat.value, {
    x: 9.2, y: 2.4, w: 3.6, h: 1.2,
    align: "center",
    fontFace: "Inter", fontSize: 48, bold: true, color: ROSE,
  });
  s.addText(e.stat.label, {
    x: 9.2, y: 3.8, w: 3.6, h: 1.0,
    align: "center",
    fontFace: "Inter", fontSize: 14, color: NAVY,
  });
}

function addStatsSlide(pres: PptxGenJs, stats: DeliveryStats) {
  const s = pres.addSlide();
  s.background = { color: NAVY };
  s.addText("Live platform stats", {
    x: 0.6, y: 0.4, w: 12, h: 0.8,
    fontFace: "Inter", fontSize: 28, bold: true, color: WHITE,
  });
  s.addText(`Snapshot: ${new Date().toISOString().slice(0, 10)}`, {
    x: 0.6, y: 1.1, w: 12, h: 0.4,
    fontFace: "Inter", fontSize: 12, color: MINT,
  });
  const tiles = [
    { label: "Students", value: stats.students },
    { label: "Teachers", value: stats.teachers },
    { label: "Parents", value: stats.parents },
    { label: "Marketers", value: stats.marketers },
    { label: "Classes", value: stats.classes },
    { label: "Sessions", value: stats.sessions },
    { label: "Recordings", value: stats.recordings },
    { label: "AI summaries", value: stats.lessonSummaries },
    { label: "Tickets", value: stats.tickets },
    { label: "Certificates", value: stats.certificates },
    { label: "Parent reports", value: stats.parentReports },
    { label: "Approved SAR", value: stats.commissionsApprovedSar.toLocaleString() },
  ];
  const cols = 4;
  const tileW = 2.9;
  const tileH = 1.2;
  const startX = 0.6;
  const startY = 1.9;
  tiles.forEach((t, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    s.addShape("roundRect", {
      x: startX + col * (tileW + 0.2),
      y: startY + row * (tileH + 0.2),
      w: tileW, h: tileH,
      fill: { color: "0F1820" }, line: { color: MINT, width: 1 }, rectRadius: 0.1,
    });
    s.addText(String(t.value), {
      x: startX + col * (tileW + 0.2),
      y: startY + row * (tileH + 0.2),
      w: tileW, h: 0.7,
      align: "center", valign: "middle",
      fontFace: "Inter", fontSize: 28, bold: true, color: ROSE,
    });
    s.addText(t.label, {
      x: startX + col * (tileW + 0.2),
      y: startY + row * (tileH + 0.2) + 0.7,
      w: tileW, h: 0.5,
      align: "center",
      fontFace: "Inter", fontSize: 11, color: MINT,
    });
  });
}

function addNextSlide(pres: PptxGenJs) {
  const s = pres.addSlide();
  s.background = { color: IVORY };
  s.addText("What's next — Phase 3 roadmap", {
    x: 0.6, y: 0.4, w: 12, h: 0.8,
    fontFace: "Inter", fontSize: 28, bold: true, color: NAVY,
  });
  s.addText(
    [
      { text: "Mobile companion app (Capacitor / Expo)", options: { bullet: true } },
      { text: "Advanced analytics: cohort retention, LTV by source", options: { bullet: true } },
      { text: "Teacher marketplace — outside hires + reviews", options: { bullet: true } },
      { text: "WhatsApp Business API direct (graduating from share-image)", options: { bullet: true } },
      { text: "Native ZATCA Phase 2 e-invoicing once required", options: { bullet: true } },
      { text: "GCC expansion — UAE + Kuwait white-label", options: { bullet: true } },
    ],
    {
      x: 0.8, y: 1.6, w: 11.5, h: 5.0,
      fontFace: "Inter", fontSize: 18, color: NAVY,
      paraSpaceAfter: 12,
    }
  );
}

function addClosingSlide(pres: PptxGenJs) {
  const s = pres.addSlide();
  s.background = { color: NAVY };
  s.addText("Thank you", {
    x: 0.6, y: 2.4, w: 12, h: 1.4,
    align: "center",
    fontFace: "Inter", fontSize: 72, bold: true, color: WHITE,
  });
  s.addText(BRAND.tagline.en + "  ·  " + BRAND.tagline.ar, {
    x: 0.6, y: 3.8, w: 12, h: 0.7,
    align: "center",
    fontFace: "Inter", fontSize: 20, color: MINT,
  });
  s.addText(BRAND.contact.email, {
    x: 0.6, y: 6.5, w: 12, h: 0.4,
    align: "center",
    fontFace: "Inter", fontSize: 12, color: MINT,
  });
}

export async function generatePresentationPptx(stats: DeliveryStats): Promise<Buffer> {
  const pres = new PptxGenJs();
  applyTheme(pres);
  addCoverSlide(pres);
  addJourneySlide(pres);
  for (const e of sprintEntries(stats)) addSprintSlide(pres, e);
  addStatsSlide(pres, stats);
  addNextSlide(pres);
  addClosingSlide(pres);
  // pptxgenjs supports Node arraybuffer output.
  const data = (await pres.write({ outputType: "nodebuffer" })) as Buffer | ArrayBuffer | string;
  if (Buffer.isBuffer(data)) return data;
  if (typeof data === "string") return Buffer.from(data, "binary");
  return Buffer.from(data as ArrayBuffer);
}
