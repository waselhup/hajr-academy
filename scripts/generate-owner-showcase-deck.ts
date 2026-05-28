/**
 * Owner Showcase Deck — 6 slides, English, Brand v3.
 * Run: npx tsx scripts/generate-owner-showcase-deck.ts
 * Output: C:\Users\WIN11-24H2GPT\hajar aca\HAJR_2DAY_SHOWCASE.pptx
 */
import pptxgen from "pptxgenjs";
import path from "path";

const C = {
  navy: "1E2A36",
  charcoal: "2C3E50",
  ivory: "FAF6EE",
  rose: "B86E7B",
  mint: "B5E5D8",
  charcoalLight: "6B7A8A",
} as const;

const FONT = "Inter";
const FONT_FALLBACK = "Calibri";

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 inches
pptx.title = "HAJR A° — 48 Hours";
pptx.author = "Ali";
pptx.company = "HAJR A° English Academy";
pptx.subject = "Owner Showcase — 2 day build";

const W = 13.333;
const H = 7.5;

// Helpers
const accentStrip = (slide: pptxgen.Slide, position: "top-left" | "bottom-right" = "top-left") => {
  if (position === "top-left") {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.4,
      y: 0.4,
      w: 1.2,
      h: 0.055,
      fill: { color: C.rose },
      line: { type: "none" },
    });
  } else {
    slide.addShape(pptx.ShapeType.rect, {
      x: W - 1.6,
      y: H - 0.45,
      w: 1.2,
      h: 0.055,
      fill: { color: C.rose },
      line: { type: "none" },
    });
  }
};

const pageNumber = (slide: pptxgen.Slide, n: number, total: number, onDark: boolean) => {
  slide.addText(`${String(n).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, {
    x: W - 1.4,
    y: H - 0.5,
    w: 1.0,
    h: 0.3,
    fontSize: 10,
    fontFace: FONT,
    color: onDark ? C.charcoalLight : C.charcoalLight,
    align: "right",
    valign: "middle",
  });
};

const footer = (slide: pptxgen.Slide, onDark: boolean) => {
  slide.addText("HAJR A° · Built in 48h · May 2026", {
    x: 0.5,
    y: H - 0.5,
    w: 6,
    h: 0.3,
    fontSize: 10,
    fontFace: FONT,
    color: onDark ? C.charcoalLight : C.charcoalLight,
    italic: true,
    valign: "middle",
  });
};

// ──────────────────────────────────────────────
// SLIDE 1 — COVER
// ──────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.navy };

  // Accent strip (top-left signature)
  accentStrip(s, "top-left");

  // "48 Hours" — title
  s.addText("48 Hours", {
    x: 0.6,
    y: 0.9,
    w: 8,
    h: 1.2,
    fontSize: 64,
    fontFace: FONT,
    bold: true,
    color: C.ivory,
    align: "left",
    valign: "middle",
  });

  // Subtitle
  s.addText("What AI Built for HAJR A°", {
    x: 0.6,
    y: 2.05,
    w: 10,
    h: 0.6,
    fontSize: 24,
    fontFace: FONT,
    color: C.rose,
    align: "left",
    valign: "middle",
  });

  // Massive number "28,501"
  s.addText("28,501", {
    x: 0.5,
    y: 2.9,
    w: 12.5,
    h: 3.2,
    fontSize: 280,
    fontFace: FONT,
    bold: true,
    color: C.ivory,
    align: "center",
    valign: "middle",
    charSpacing: -8,
  });

  // Label beneath
  s.addText("lines of production code", {
    x: 0.5,
    y: 6.0,
    w: 12.5,
    h: 0.4,
    fontSize: 16,
    fontFace: FONT,
    color: C.charcoalLight,
    align: "center",
    valign: "middle",
    charSpacing: 8,
  });

  // Footer (cover-specific)
  s.addText("Ali  ·  Built with Claude Sonnet 4.6 + Claude Code  ·  May 27-28, 2026", {
    x: 0.5,
    y: H - 0.55,
    w: 12.3,
    h: 0.4,
    fontSize: 11,
    fontFace: FONT,
    color: C.charcoalLight,
    italic: true,
    align: "center",
    valign: "middle",
  });
}

// ──────────────────────────────────────────────
// SLIDE 2 — THE RECEIPTS (3×2 data wall)
// ──────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.ivory };
  accentStrip(s, "top-left");

  s.addText("The Receipts", {
    x: 0.6,
    y: 0.6,
    w: 12,
    h: 0.8,
    fontSize: 36,
    fontFace: FONT,
    bold: true,
    color: C.charcoal,
    align: "left",
    valign: "middle",
  });

  s.addText("Two days. Zero excuses.", {
    x: 0.6,
    y: 1.35,
    w: 12,
    h: 0.4,
    fontSize: 14,
    fontFace: FONT,
    color: C.rose,
    italic: true,
    align: "left",
    valign: "middle",
  });

  const stats: { num: string; label: string }[] = [
    { num: "6", label: "sprints shipped" },
    { num: "232", label: "files changed" },
    { num: "28,501", label: "lines added" },
    { num: "315", label: "routes built" },
    { num: "60", label: "database models" },
    { num: "1,766", label: "translations (AR = EN parity)" },
  ];

  const gridX = 0.6;
  const gridY = 2.1;
  const gridW = 12.13;
  const gridH = 4.6;
  const cols = 3;
  const rows = 2;
  const cellW = gridW / cols;
  const cellH = gridH / rows;

  stats.forEach((stat, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = gridX + col * cellW;
    const y = gridY + row * cellH;

    // Big number
    s.addText(stat.num, {
      x: x,
      y: y + 0.3,
      w: cellW,
      h: cellH * 0.55,
      fontSize: 72,
      fontFace: FONT,
      bold: true,
      color: C.charcoal,
      align: "center",
      valign: "bottom",
      charSpacing: -2,
    });

    // Label
    s.addText(stat.label, {
      x: x,
      y: y + cellH * 0.6 + 0.3,
      w: cellW,
      h: cellH * 0.3,
      fontSize: 13,
      fontFace: FONT,
      color: C.charcoalLight,
      align: "center",
      valign: "top",
      charSpacing: 4,
    });

    // Rose Mauve divider (right edge of cell, except last column)
    if (col < cols - 1) {
      s.addShape(pptx.ShapeType.rect, {
        x: x + cellW - 0.02,
        y: y + cellH * 0.25,
        w: 0.02,
        h: cellH * 0.5,
        fill: { color: C.rose },
        line: { type: "none" },
      });
    }
    // Horizontal divider between rows
    if (row === 0) {
      s.addShape(pptx.ShapeType.rect, {
        x: x + cellW * 0.25,
        y: y + cellH - 0.02,
        w: cellW * 0.5,
        h: 0.02,
        fill: { color: C.rose },
        line: { type: "none" },
      });
    }
  });

  footer(s, false);
  pageNumber(s, 2, 6, false);
}

// ──────────────────────────────────────────────
// SLIDE 3 — SIX SPRINTS TIMELINE
// ──────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.navy };
  accentStrip(s, "top-left");

  s.addText("Six Sprints, One Platform", {
    x: 0.6,
    y: 0.6,
    w: 12,
    h: 0.8,
    fontSize: 34,
    fontFace: FONT,
    bold: true,
    color: C.ivory,
    align: "left",
    valign: "middle",
  });

  s.addText("From empty repo to production SaaS.", {
    x: 0.6,
    y: 1.35,
    w: 12,
    h: 0.4,
    fontSize: 14,
    fontFace: FONT,
    color: C.rose,
    italic: true,
    align: "left",
    valign: "middle",
  });

  const sprints = [
    { badge: "S1", title: "Foundations", line: "Universal notify pipe" },
    { badge: "S2", title: "Marketers", line: "Auto-commission engine" },
    { badge: "S3", title: "Operations", line: "AI-triaged tickets" },
    { badge: "S4", title: "Retention", line: "Auto parent reports" },
    { badge: "S5", title: "AI + Brand", line: "Claude lesson summaries" },
    { badge: "M", title: "Manuals", line: "6 bilingual books" },
  ];

  const startX = 0.6;
  const startY = 2.5;
  const cardW = 1.95;
  const cardH = 3.2;
  const gap = 0.13;

  // Horizontal connecting line behind cards
  s.addShape(pptx.ShapeType.rect, {
    x: startX,
    y: startY + cardH / 2 - 0.02,
    w: 6 * cardW + 5 * gap,
    h: 0.04,
    fill: { color: C.rose },
    line: { type: "none" },
  });

  sprints.forEach((sp, i) => {
    const x = startX + i * (cardW + gap);

    // Card background
    s.addShape(pptx.ShapeType.rect, {
      x: x,
      y: startY,
      w: cardW,
      h: cardH,
      fill: { color: C.ivory },
      line: { type: "none" },
    });

    // Rose mauve badge circle
    s.addShape(pptx.ShapeType.ellipse, {
      x: x + cardW / 2 - 0.45,
      y: startY + 0.35,
      w: 0.9,
      h: 0.9,
      fill: { color: C.rose },
      line: { type: "none" },
    });

    // Badge text
    s.addText(sp.badge, {
      x: x + cardW / 2 - 0.45,
      y: startY + 0.35,
      w: 0.9,
      h: 0.9,
      fontSize: 22,
      fontFace: FONT,
      bold: true,
      color: C.ivory,
      align: "center",
      valign: "middle",
    });

    // Sprint title
    s.addText(sp.title, {
      x: x + 0.1,
      y: startY + 1.45,
      w: cardW - 0.2,
      h: 0.5,
      fontSize: 16,
      fontFace: FONT,
      bold: true,
      color: C.charcoal,
      align: "center",
      valign: "middle",
    });

    // Thin divider
    s.addShape(pptx.ShapeType.rect, {
      x: x + cardW / 2 - 0.2,
      y: startY + 2.0,
      w: 0.4,
      h: 0.02,
      fill: { color: C.rose },
      line: { type: "none" },
    });

    // One-line description
    s.addText(sp.line, {
      x: x + 0.15,
      y: startY + 2.15,
      w: cardW - 0.3,
      h: 0.9,
      fontSize: 11,
      fontFace: FONT,
      color: C.charcoalLight,
      align: "center",
      valign: "top",
    });
  });

  footer(s, true);
  pageNumber(s, 3, 6, true);
}

// ──────────────────────────────────────────────
// SLIDE 4 — COMPETITIVE MOAT
// ──────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.ivory };
  accentStrip(s, "top-left");

  s.addText("What No Saudi Academy Has", {
    x: 0.6,
    y: 0.6,
    w: 12,
    h: 0.8,
    fontSize: 36,
    fontFace: FONT,
    bold: true,
    color: C.charcoal,
    align: "left",
    valign: "middle",
  });

  s.addText("Three things our competitors physically cannot ship.", {
    x: 0.6,
    y: 1.35,
    w: 12,
    h: 0.4,
    fontSize: 14,
    fontFace: FONT,
    color: C.rose,
    italic: true,
    align: "left",
    valign: "middle",
  });

  const moats = [
    {
      headline: "Auto-Generated Monthly Parent Reports",
      body: "PDF + WhatsApp share image, delivered on the 1st without lifting a finger.",
    },
    {
      headline: "Claude AI Lesson Summaries",
      body: "Every Zoom recording becomes bilingual notes, vocab cards, and homework — automatically.",
    },
    {
      headline: "QR-Verified Certificates",
      body: "Every cert has a public /verify/[code] page. Impossible to forge.",
    },
  ];

  const startY = 2.3;
  const itemH = 1.4;
  const gap = 0.2;

  moats.forEach((m, i) => {
    const y = startY + i * (itemH + gap);

    // Oversized ✓ in Rose Mauve
    s.addText("✓", {
      x: 0.6,
      y: y,
      w: 1.0,
      h: itemH,
      fontSize: 72,
      fontFace: FONT,
      bold: true,
      color: C.rose,
      align: "center",
      valign: "middle",
    });

    // Headline
    s.addText(m.headline, {
      x: 1.8,
      y: y + 0.1,
      w: 11,
      h: 0.6,
      fontSize: 22,
      fontFace: FONT,
      bold: true,
      color: C.charcoal,
      align: "left",
      valign: "middle",
    });

    // Body
    s.addText(m.body, {
      x: 1.8,
      y: y + 0.72,
      w: 11,
      h: 0.6,
      fontSize: 14,
      fontFace: FONT,
      color: C.charcoalLight,
      align: "left",
      valign: "middle",
    });
  });

  footer(s, false);
  pageNumber(s, 4, 6, false);
}

// ──────────────────────────────────────────────
// SLIDE 5 — AI STACK (two columns)
// ──────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.navy };
  accentStrip(s, "top-left");

  s.addText("How a Solo Operator Built a SaaS", {
    x: 0.6,
    y: 0.6,
    w: 12,
    h: 0.8,
    fontSize: 32,
    fontFace: FONT,
    bold: true,
    color: C.ivory,
    align: "left",
    valign: "middle",
  });

  s.addText("Division of labor — human × machine.", {
    x: 0.6,
    y: 1.35,
    w: 12,
    h: 0.4,
    fontSize: 14,
    fontFace: FONT,
    color: C.rose,
    italic: true,
    align: "left",
    valign: "middle",
  });

  const colY = 2.2;
  const colH = 4.0;
  const leftX = 0.7;
  const colW = 5.85;
  const rightX = W - colW - 0.7;

  // Column headers
  s.addText("What I Did", {
    x: leftX,
    y: colY,
    w: colW,
    h: 0.6,
    fontSize: 22,
    fontFace: FONT,
    bold: true,
    color: C.rose,
    align: "left",
    valign: "middle",
    charSpacing: 4,
  });

  s.addText("What AI Did", {
    x: rightX,
    y: colY,
    w: colW,
    h: 0.6,
    fontSize: 22,
    fontFace: FONT,
    bold: true,
    color: C.mint,
    align: "left",
    valign: "middle",
    charSpacing: 4,
  });

  // Mint frost vertical divider between columns
  s.addShape(pptx.ShapeType.rect, {
    x: W / 2 - 0.015,
    y: colY + 0.2,
    w: 0.03,
    h: colH,
    fill: { color: C.mint },
    line: { type: "none" },
  });

  const leftItems = ["Vision", "Decisions", "Prompts", "QA", "Brand"];
  const rightItems = ["Code", "Schemas", "Translations", "Docs", "Tests"];

  const itemStartY = colY + 0.9;
  const itemH = 0.7;

  leftItems.forEach((item, i) => {
    s.addText(item, {
      x: leftX,
      y: itemStartY + i * itemH,
      w: colW,
      h: itemH,
      fontSize: 22,
      fontFace: FONT,
      color: C.ivory,
      align: "left",
      valign: "middle",
    });
  });

  rightItems.forEach((item, i) => {
    s.addText(item, {
      x: rightX,
      y: itemStartY + i * itemH,
      w: colW,
      h: itemH,
      fontSize: 22,
      fontFace: FONT,
      color: C.ivory,
      align: "left",
      valign: "middle",
    });
  });

  // Bottom line — the stack
  s.addText(
    "Claude Sonnet 4.6 = architect  ·  Claude Haiku 4.5 = in-product AI  ·  Claude Code = executor",
    {
      x: 0.6,
      y: 6.7,
      w: 12.1,
      h: 0.4,
      fontSize: 13,
      fontFace: FONT,
      color: C.charcoalLight,
      italic: true,
      align: "center",
      valign: "middle",
      charSpacing: 2,
    },
  );

  footer(s, true);
  pageNumber(s, 5, 6, true);
}

// ──────────────────────────────────────────────
// SLIDE 6 — THE NEXT 90 DAYS
// ──────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: C.ivory };
  accentStrip(s, "top-left");

  s.addText("The Next 90 Days", {
    x: 0.6,
    y: 0.6,
    w: 12,
    h: 0.8,
    fontSize: 36,
    fontFace: FONT,
    bold: true,
    color: C.charcoal,
    align: "left",
    valign: "middle",
  });

  s.addText("This is just day two.", {
    x: 0.6,
    y: 1.35,
    w: 12,
    h: 0.4,
    fontSize: 14,
    fontFace: FONT,
    color: C.rose,
    italic: true,
    align: "left",
    valign: "middle",
  });

  const phases = [
    {
      tag: "NOW",
      title: "Owner sign-off + handover",
      sub: "20% partnership signed",
    },
    {
      tag: "+30",
      title: "Onboard real students",
      sub: "Launch marketer referral codes",
    },
    {
      tag: "+90",
      title: "v2.1 release",
      sub: "Feature requests from teachers shipped",
    },
  ];

  const startX = 0.6;
  const startY = 2.6;
  const cardW = 3.95;
  const cardH = 3.0;
  const gap = 0.2;

  phases.forEach((p, i) => {
    const x = startX + i * (cardW + gap);

    // Card frame
    s.addShape(pptx.ShapeType.rect, {
      x: x,
      y: startY,
      w: cardW,
      h: cardH,
      fill: { color: C.ivory },
      line: { color: C.charcoal, width: 1 },
    });

    // Top accent strip on card
    s.addShape(pptx.ShapeType.rect, {
      x: x,
      y: startY,
      w: cardW,
      h: 0.12,
      fill: { color: C.rose },
      line: { type: "none" },
    });

    // Phase tag
    s.addText(p.tag, {
      x: x + 0.2,
      y: startY + 0.4,
      w: cardW - 0.4,
      h: 0.7,
      fontSize: 32,
      fontFace: FONT,
      bold: true,
      color: C.rose,
      align: "left",
      valign: "middle",
      charSpacing: 4,
    });

    // Title
    s.addText(p.title, {
      x: x + 0.2,
      y: startY + 1.3,
      w: cardW - 0.4,
      h: 0.8,
      fontSize: 18,
      fontFace: FONT,
      bold: true,
      color: C.charcoal,
      align: "left",
      valign: "middle",
    });

    // Sub
    s.addText(p.sub, {
      x: x + 0.2,
      y: startY + 2.0,
      w: cardW - 0.4,
      h: 0.6,
      fontSize: 13,
      fontFace: FONT,
      color: C.charcoalLight,
      align: "left",
      valign: "middle",
    });

    // Arrow (between cards)
    if (i < phases.length - 1) {
      const arrowX = x + cardW + 0.02;
      const arrowY = startY + cardH / 2 - 0.08;
      // arrow shaft
      s.addShape(pptx.ShapeType.rect, {
        x: arrowX,
        y: arrowY + 0.07,
        w: gap - 0.05,
        h: 0.025,
        fill: { color: C.charcoal },
        line: { type: "none" },
      });
      // arrowhead (right-pointing triangle)
      s.addShape(pptx.ShapeType.rtTriangle, {
        x: arrowX + gap - 0.13,
        y: arrowY,
        w: 0.18,
        h: 0.18,
        fill: { color: C.charcoal },
        line: { type: "none" },
        rotate: 45,
      });
    }
  });

  // Closing italic line
  s.addText("This platform is alive. It learns. It will only get better.", {
    x: 0.6,
    y: 6.1,
    w: 12.1,
    h: 0.5,
    fontSize: 18,
    fontFace: FONT,
    italic: true,
    color: C.rose,
    align: "center",
    valign: "middle",
  });

  footer(s, false);
  pageNumber(s, 6, 6, false);
}

// ──────────────────────────────────────────────
// SAVE
// ──────────────────────────────────────────────
const outPath = path.resolve("C:\\Users\\WIN11-24H2GPT\\hajar aca\\HAJR_2DAY_SHOWCASE.pptx");

pptx.writeFile({ fileName: outPath }).then((file) => {
  // eslint-disable-next-line no-console
  console.log(`[OK] Wrote ${file}`);
});
