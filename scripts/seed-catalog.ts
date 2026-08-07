/**
 * Seed / re-sync the purchasable catalogue from the owner's official price
 * list (profile pp. 7–8 — the same numbers the landing page displays).
 *
 * Idempotent: upserts by slug, so re-running it repairs drift without
 * duplicating rows. Prices edited later in /admin/finance/products are NOT
 * overwritten unless --force is passed.
 *
 *   npx tsx scripts/seed-catalog.ts [--force]
 */
import { PrismaClient, type CatalogGroup, type PackageType } from "@prisma/client";

const prisma = new PrismaClient();
const FORCE = process.argv.includes("--force");

interface Seed {
  slug: string;
  nameAr: string;
  nameEn: string;
  descAr?: string;
  descEn?: string;
  priceSar: number;
  compareAtSar?: number;
  unitAr: string;
  unitEn: string;
  group: CatalogGroup;
  packageType?: PackageType;
  sortOrder: number;
}

const CORE_DESC_AR = "لجميع الصفوف من الأول الابتدائي إلى الثالث الثانوي، وفق المنهج السعودي.";
const CORE_DESC_EN = "All grades from year 1 to year 12, aligned to the Saudi curriculum.";

const PRODUCTS: Seed[] = [
  // ── Core term-reinforcement program ──
  {
    slug: "core-monthly",
    nameAr: "التقوية الفصلية — اشتراك شهري",
    nameEn: "Term reinforcement — monthly",
    descAr: CORE_DESC_AR,
    descEn: CORE_DESC_EN,
    priceSar: 300,
    unitAr: "ر.س / شهر",
    unitEn: "SAR / month",
    group: "CORE",
    packageType: "INTEGRATED",
    sortOrder: 10,
  },
  {
    slug: "core-term",
    nameAr: "التقوية الفصلية — فصل دراسي كامل",
    nameEn: "Term reinforcement — full term",
    descAr: CORE_DESC_AR,
    descEn: CORE_DESC_EN,
    priceSar: 1215,
    compareAtSar: 1350,
    unitAr: "ر.س / فصل",
    unitEn: "SAR / term",
    group: "CORE",
    packageType: "INTEGRATED",
    sortOrder: 20,
  },
  {
    slug: "core-yearly",
    nameAr: "التقوية الفصلية — سنة دراسية كاملة",
    nameEn: "Term reinforcement — full year",
    descAr: CORE_DESC_AR,
    descEn: CORE_DESC_EN,
    priceSar: 2106,
    compareAtSar: 2700,
    unitAr: "ر.س / سنة",
    unitEn: "SAR / year",
    group: "CORE",
    packageType: "INTEGRATED",
    sortOrder: 30,
  },

  // ── Exam courses ──
  {
    slug: "step-course",
    nameAr: "دورة ستيب التحضيرية",
    nameEn: "STEP preparation course",
    descAr: "تحضير مركّز يوصلك للدرجة بثقة.",
    descEn: "Focused preparation that gets you to your target score.",
    priceSar: 600,
    unitAr: "ر.س / دورة",
    unitEn: "SAR / course",
    group: "COURSE",
    packageType: "STEP_PREP_PKG",
    sortOrder: 40,
  },
  {
    slug: "ielts-toefl-course",
    nameAr: "دورة آيلتس وتوفل",
    nameEn: "IELTS & TOEFL course",
    descAr: "استعداد كامل للاختبارات الدولية.",
    descEn: "Complete preparation for the international exams.",
    priceSar: 1200,
    unitAr: "ر.س / دورة",
    unitEn: "SAR / course",
    group: "COURSE",
    packageType: "IELTS_PREP_PKG",
    sortOrder: 50,
  },
];

// ── Summer intensive tracks: 3 tracks × 3 tiers, priced monthly ──
const SUMMER: {
  track: string;
  trackAr: string;
  slugBase: string;
  pkg: PackageType;
  tiers: { tier: string; tierAr: string; freqAr: string; freqEn: string; month: number }[];
}[] = [
  {
    track: "Group track",
    trackAr: "المسار الجماعي",
    slugBase: "summer-group",
    pkg: "INTEGRATED",
    tiers: [
      { tier: "Starter", tierAr: "المبتدئ", freqAr: "حصة أسبوعياً", freqEn: "1 lesson / week", month: 132 },
      { tier: "Growth", tierAr: "المتوسط", freqAr: "حصتان أسبوعياً", freqEn: "2 lessons / week", month: 240 },
      { tier: "Intensive", tierAr: "المكثّف", freqAr: "3 حصص أسبوعياً", freqEn: "3 lessons / week", month: 336 },
    ],
  },
  {
    track: "International track",
    trackAr: "المسار الدولي",
    slugBase: "summer-intl",
    pkg: "IELTS_PREP_PKG",
    tiers: [
      { tier: "Starter", tierAr: "المبتدئ", freqAr: "حصة أسبوعياً", freqEn: "1 lesson / week", month: 168 },
      { tier: "Growth", tierAr: "المتوسط", freqAr: "حصتان أسبوعياً", freqEn: "2 lessons / week", month: 304 },
      { tier: "Intensive", tierAr: "المكثّف", freqAr: "3 حصص أسبوعياً", freqEn: "3 lessons / week", month: 420 },
    ],
  },
  {
    track: "Native-speaker track",
    trackAr: "مسار الناطقين الأصليين",
    slugBase: "summer-native",
    pkg: "PRIVATE",
    tiers: [
      { tier: "Starter", tierAr: "المبتدئ", freqAr: "حصة أسبوعياً", freqEn: "1 lesson / week", month: 248 },
      { tier: "Growth", tierAr: "المتوسط", freqAr: "حصتان أسبوعياً", freqEn: "2 lessons / week", month: 464 },
      { tier: "Intensive", tierAr: "المكثّف", freqAr: "3 حصص أسبوعياً", freqEn: "3 lessons / week", month: 648 },
    ],
  },
];

let order = 60;
for (const tr of SUMMER) {
  for (const ti of tr.tiers) {
    PRODUCTS.push({
      slug: `${tr.slugBase}-${ti.tier.toLowerCase()}`,
      nameAr: `${tr.trackAr} — ${ti.tierAr}`,
      nameEn: `${tr.track} — ${ti.tier}`,
      descAr: `البرنامج الصيفي المكثّف · ${ti.freqAr}`,
      descEn: `Summer intensive · ${ti.freqEn}`,
      priceSar: ti.month,
      unitAr: "ر.س / شهر",
      unitEn: "SAR / month",
      group: "SUMMER",
      packageType: tr.pkg,
      sortOrder: (order += 10),
    });
  }
}

async function main() {
  let created = 0;
  let updated = 0;
  for (const p of PRODUCTS) {
    const existing = await prisma.catalogProduct.findUnique({
      where: { slug: p.slug },
      select: { id: true },
    });
    const data = {
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      descAr: p.descAr ?? null,
      descEn: p.descEn ?? null,
      unitAr: p.unitAr,
      unitEn: p.unitEn,
      group: p.group,
      packageType: p.packageType ?? null,
      sortOrder: p.sortOrder,
      isActive: true,
    };
    if (!existing) {
      await prisma.catalogProduct.create({
        data: {
          slug: p.slug,
          ...data,
          priceSar: p.priceSar,
          compareAtSar: p.compareAtSar ?? null,
        },
      });
      created++;
    } else {
      // Never silently overwrite a price the owner edited in the admin UI.
      await prisma.catalogProduct.update({
        where: { slug: p.slug },
        data: FORCE
          ? { ...data, priceSar: p.priceSar, compareAtSar: p.compareAtSar ?? null }
          : data,
      });
      updated++;
    }
  }
  const all = await prisma.catalogProduct.findMany({
    orderBy: { sortOrder: "asc" },
    select: { slug: true, nameAr: true, priceSar: true, group: true },
  });
  console.log(`created=${created} updated=${updated} (force=${FORCE})`);
  console.table(
    all.map((p) => ({ slug: p.slug, group: p.group, price: String(p.priceSar) }))
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
