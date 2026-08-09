/**
 * The products the Early Registration 2026 landing page sells.
 *
 * WHY new rows instead of editing the existing ones: the campaign quotes
 * different figures from the current price list (4 months 1,140 vs 1,215;
 * school year 2,400 vs 2,106). Editing `core-*` in place would silently
 * change what the main site advertises and what past pay-links resolve to.
 * These are separate products with their own slugs, so the campaign and the
 * main site can run side by side and the owner decides later whether to
 * retire the old ones.
 *
 * Every price shown on the landing page MUST exist here. The page reads
 * these rows, so a displayed price and a charged price cannot drift apart —
 * that was the whole point of moving prices out of the code.
 *
 * Idempotent: existing rows are left alone unless --force is passed.
 *   npx tsx scripts/seed-early-registration-catalog.ts [--force]
 */
import { PrismaClient, type CatalogGroup, type PackageType } from "@prisma/client";

const prisma = new PrismaClient();
const FORCE = process.argv.includes("--force");

interface Row {
  slug: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  priceSar: number;
  compareAtSar?: number;
  unitAr: string;
  unitEn: string;
  group: CatalogGroup;
  packageType: PackageType;
  requiresGradeLevel: boolean;
  sortOrder: number;
  bulletsAr: string[];
  bulletsEn: string[];
}

const PRODUCTS: Row[] = [
  // ── Early registration: the comprehensive programme ──────────────────
  {
    slug: "early-first-month",
    nameAr: "التسجيل المبكر — الشهر الأول",
    nameEn: "Early registration — first month",
    descAr: "8 حصص مباشرة، ثم يستمر الاشتراك بـ 350 ريالاً شهرياً.",
    descEn: "8 live classes. The subscription then continues at SAR 350 per month.",
    priceSar: 300,
    compareAtSar: 350,
    unitAr: "ر.س / الشهر الأول",
    unitEn: "SAR / first month",
    group: "CORE",
    packageType: "INTEGRATED",
    requiresGradeLevel: true,
    sortOrder: 1,
    bulletsAr: ["8 حصص مباشرة", "حساب الطالب و English Lab", "ثم 350 ريالاً شهرياً"],
    bulletsEn: ["8 live classes", "Student account and English Lab", "Then SAR 350 per month"],
  },
  {
    slug: "early-4-months",
    nameAr: "التسجيل المبكر — باقة 4 أشهر",
    nameEn: "Early registration — 4-month plan",
    descAr: "32 حصة مباشرة بما يعادل 285 ريالاً شهرياً، تُدفع مقدماً.",
    descEn: "32 live classes — about SAR 285 per month, paid upfront.",
    priceSar: 1140,
    compareAtSar: 1400,
    unitAr: "ر.س / 4 أشهر",
    unitEn: "SAR / 4 months",
    group: "CORE",
    packageType: "INTEGRATED",
    requiresGradeLevel: true,
    sortOrder: 2,
    bulletsAr: ["32 حصة مباشرة", "285 ريالاً شهرياً", "جميع مزايا المنصة"],
    bulletsEn: ["32 live classes", "SAR 285 per month", "All platform benefits"],
  },
  {
    slug: "early-academic-year",
    nameAr: "التسجيل المبكر — العام الدراسي",
    nameEn: "Early registration — school year",
    descAr: "9 أشهر تعليمية بما يعادل نحو 267 ريالاً شهرياً، تُدفع مقدماً.",
    descEn: "9 learning months — about SAR 267 per month, paid upfront.",
    priceSar: 2400,
    compareAtSar: 3150,
    unitAr: "ر.س / العام الدراسي",
    unitEn: "SAR / school year",
    group: "CORE",
    packageType: "INTEGRATED",
    requiresGradeLevel: true,
    sortOrder: 3,
    bulletsAr: ["9 أشهر تعليمية", "نحو 267 ريالاً شهرياً", "استمرارية طوال العام"],
    bulletsEn: ["9 learning months", "About SAR 267 per month", "Consistent learning all year"],
  },

  // ── English programmes ───────────────────────────────────────────────
  {
    slug: "english-for-kids",
    nameAr: "English for Kids",
    nameEn: "English for Kids",
    descAr: "محادثة ونطق وقصص وألعاب؛ برنامج مختلف عن تقوية المنهج.",
    descEn: "Speaking, pronunciation, stories and games — distinct from curriculum support.",
    priceSar: 350,
    unitAr: "ر.س / شهرياً",
    unitEn: "SAR / month",
    group: "COURSE",
    packageType: "ESSENTIAL",
    requiresGradeLevel: true,
    sortOrder: 60,
    bulletsAr: ["مجموعات صغيرة", "English Lab"],
    bulletsEn: ["Small groups", "English Lab"],
  },
  {
    slug: "general-english",
    nameAr: "General English",
    nameEn: "General English",
    descAr: "قراءة واستماع وتحدث وكتابة بصورة متوازنة.",
    descEn: "Balanced reading, listening, speaking and writing.",
    priceSar: 300,
    unitAr: "ر.س / شهرياً",
    unitEn: "SAR / month",
    group: "COURSE",
    packageType: "ESSENTIAL",
    requiresGradeLevel: false,
    sortOrder: 61,
    bulletsAr: ["8 حصص شهرية", "حساب الطالب و English Lab"],
    bulletsEn: ["8 classes per month", "Student account and English Lab"],
  },
  {
    slug: "business-english",
    nameAr: "Business English",
    nameEn: "Business English",
    descAr: "اجتماعات وعروض وبريد مهني ومقابلات.",
    descEn: "Meetings, presentations, professional email and interviews.",
    priceSar: 450,
    unitAr: "ر.س / شهرياً",
    unitEn: "SAR / month",
    group: "COURSE",
    packageType: "ESSENTIAL",
    requiresGradeLevel: false,
    sortOrder: 62,
    bulletsAr: ["مواقف عمل عملية", "تدريب عبر المنصة"],
    bulletsEn: ["Real workplace scenarios", "Platform-based practice"],
  },

  // ── Exams and admissions ─────────────────────────────────────────────
  {
    slug: "cpc-prep",
    nameAr: "تحضير الإنجليزية لـ CPC",
    nameEn: "English preparation for CPC",
    descAr: "3 أسابيع و12 حصة مباشرة، إنجليزي فقط.",
    descEn: "3 weeks and 12 live classes, English only.",
    priceSar: 249,
    unitAr: "ر.س / المسار",
    unitEn: "SAR / track",
    group: "COURSE",
    packageType: "STEP_PREP_PKG",
    requiresGradeLevel: false,
    sortOrder: 63,
    bulletsAr: ["اختباران محاكيان", "إنجليزي فقط"],
    bulletsEn: ["2 mock tests", "English only"],
  },
  {
    slug: "itc-prep",
    nameAr: "تحضير الإنجليزية لـ ITC",
    nameEn: "English preparation for ITC",
    descAr: "3 أسابيع و12 حصة مباشرة، إنجليزي فقط.",
    descEn: "3 weeks and 12 live classes, English only.",
    priceSar: 249,
    unitAr: "ر.س / المسار",
    unitEn: "SAR / track",
    group: "COURSE",
    packageType: "STEP_PREP_PKG",
    requiresGradeLevel: false,
    sortOrder: 64,
    bulletsAr: ["اختباران محاكيان", "إنجليزي فقط"],
    bulletsEn: ["2 mock tests", "English only"],
  },

  // ── Private 1:1 ──────────────────────────────────────────────────────
  {
    slug: "private-intl-8",
    nameAr: "فردي مع معلم دولي — 8 حصص",
    nameEn: "Private with an international tutor — 8 classes",
    descAr: "25 دقيقة للحصة، بما يعادل 38 ريالاً للحصة.",
    descEn: "25 minutes per class — about SAR 38 each.",
    priceSar: 304,
    unitAr: "ر.س / 8 حصص",
    unitEn: "SAR / 8 classes",
    group: "COURSE",
    packageType: "PRIVATE",
    requiresGradeLevel: false,
    sortOrder: 70,
    bulletsAr: ["38 ريالاً للحصة", "خطة شخصية"],
    bulletsEn: ["SAR 38 per class", "Personal plan"],
  },
  {
    slug: "private-intl-12",
    nameAr: "فردي مع معلم دولي — 12 حصة",
    nameEn: "Private with an international tutor — 12 classes",
    descAr: "25 دقيقة للحصة، بما يعادل 35 ريالاً للحصة.",
    descEn: "25 minutes per class — about SAR 35 each.",
    priceSar: 420,
    unitAr: "ر.س / 12 حصة",
    unitEn: "SAR / 12 classes",
    group: "COURSE",
    packageType: "PRIVATE",
    requiresGradeLevel: false,
    sortOrder: 71,
    bulletsAr: ["35 ريالاً للحصة", "25 دقيقة للحصة"],
    bulletsEn: ["SAR 35 per class", "25 minutes per class"],
  },
  {
    slug: "private-native-8",
    nameAr: "فردي مع متحدث أصلي — 8 حصص",
    nameEn: "Private with a native speaker — 8 classes",
    descAr: "نطق وطلاقة وتفاعل طبيعي، 25 دقيقة للحصة.",
    descEn: "Natural pronunciation and fluency, 25 minutes per class.",
    priceSar: 464,
    unitAr: "ر.س / 8 حصص",
    unitEn: "SAR / 8 classes",
    group: "COURSE",
    packageType: "PRIVATE",
    requiresGradeLevel: false,
    sortOrder: 72,
    bulletsAr: ["متحدث أصلي", "25 دقيقة للحصة"],
    bulletsEn: ["Native speaker", "25 minutes per class"],
  },
  {
    slug: "private-native-12",
    nameAr: "فردي مع متحدث أصلي — 12 حصة",
    nameEn: "Private with a native speaker — 12 classes",
    descAr: "نطق وطلاقة وتفاعل طبيعي، 25 دقيقة للحصة.",
    descEn: "Natural pronunciation and fluency, 25 minutes per class.",
    priceSar: 648,
    unitAr: "ر.س / 12 حصة",
    unitEn: "SAR / 12 classes",
    group: "COURSE",
    packageType: "PRIVATE",
    requiresGradeLevel: false,
    sortOrder: 73,
    bulletsAr: ["متحدث أصلي", "25 دقيقة للحصة"],
    bulletsEn: ["Native speaker", "25 minutes per class"],
  },
];

async function main() {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const p of PRODUCTS) {
    const existing = await prisma.catalogProduct.findUnique({
      where: { slug: p.slug },
      select: { id: true, priceSar: true },
    });

    const data = {
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      descAr: p.descAr,
      descEn: p.descEn,
      compareAtSar: p.compareAtSar ?? null,
      unitAr: p.unitAr,
      unitEn: p.unitEn,
      group: p.group,
      packageType: p.packageType,
      requiresGradeLevel: p.requiresGradeLevel,
      isActive: true,
      sortOrder: p.sortOrder,
      bulletsAr: p.bulletsAr,
      bulletsEn: p.bulletsEn,
    };

    if (!existing) {
      await prisma.catalogProduct.create({
        data: { slug: p.slug, priceSar: p.priceSar, ...data },
      });
      created++;
      continue;
    }
    if (!FORCE) {
      // Never overwrite a price the owner may have edited in /admin.
      skipped++;
      continue;
    }
    await prisma.catalogProduct.update({
      where: { slug: p.slug },
      data: { priceSar: p.priceSar, ...data },
    });
    updated++;
  }

  console.log({ created, updated, skipped, force: FORCE });

  const rows = await prisma.catalogProduct.findMany({
    where: { slug: { in: PRODUCTS.map((p) => p.slug) } },
    select: { slug: true, priceSar: true, compareAtSar: true, isActive: true, requiresGradeLevel: true },
    orderBy: { sortOrder: "asc" },
  });
  console.table(
    rows.map((r) => ({
      slug: r.slug,
      price: String(r.priceSar),
      was: r.compareAtSar ? String(r.compareAtSar) : "—",
      active: r.isActive,
      asksYear: r.requiresGradeLevel,
    }))
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
