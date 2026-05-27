/**
 * Seeds the BrandKitAsset table with the default Sprint 5 catalog.
 * Idempotent: upserts by `type`.
 * Run: npx tsx prisma/seed-brand-kit.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AssetSeed {
  type: string;
  name: string;
  nameAr: string;
  category: "IDENTITY" | "PRINT" | "DIGITAL" | "SOCIAL";
  url: string;
  downloadUrl: string;
  description?: string;
  descriptionAr?: string;
  sortOrder: number;
}

const ASSETS: AssetSeed[] = [
  {
    type: "LOGO_PRIMARY",
    name: "Primary logo",
    nameAr: "الشعار الأساسي",
    category: "IDENTITY",
    url: "/hajr-logo.svg",
    downloadUrl: "/hajr-logo.svg",
    description: "Full primary lockup — HAJR A° with rose dot.",
    descriptionAr: "الشعار الكامل الأساسي — HAJR A° مع النقطة الوردية.",
    sortOrder: 1,
  },
  {
    type: "LOGO_MARK",
    name: "Logo mark (favicon)",
    nameAr: "العلامة فقط (الأيقونة)",
    category: "IDENTITY",
    url: "/favicon.svg",
    downloadUrl: "/favicon.svg",
    description: "Square mark for app icons, favicons, social avatars.",
    descriptionAr: "العلامة المربعة لأيقونة التطبيق والمواقع وحسابات التواصل.",
    sortOrder: 2,
  },
  {
    type: "OG_IMAGE",
    name: "Open Graph image",
    nameAr: "صورة المشاركة الاجتماعية",
    category: "DIGITAL",
    url: "/og-image.svg",
    downloadUrl: "/og-image.svg",
    description: "1200×630 image for link previews.",
    descriptionAr: "صورة ١٢٠٠×٦٣٠ لمعاينات الروابط.",
    sortOrder: 10,
  },
  {
    type: "BRAND_BOOK",
    name: "Complete brand book v3.0",
    nameAr: "دليل العلامة الكامل ٣٫٠",
    category: "PRINT",
    url: "/api/admin/brand-kit/book",
    downloadUrl: "/api/admin/brand-kit/book",
    description: "10-page brand bible — colors, logos, fonts, voice, social.",
    descriptionAr: "دليل العلامة من ١٠ صفحات — الألوان والشعارات والخطوط والنبرة.",
    sortOrder: 0,
  },
  {
    type: "FONT_INTER",
    name: "Inter font family",
    nameAr: "خط Inter",
    category: "DIGITAL",
    url: "https://fonts.google.com/specimen/Inter",
    downloadUrl: "https://fonts.google.com/specimen/Inter",
    description: "Open-source Latin sans serif.",
    descriptionAr: "خط لاتيني مفتوح المصدر.",
    sortOrder: 20,
  },
  {
    type: "FONT_PLEX",
    name: "IBM Plex Sans Arabic",
    nameAr: "خط IBM Plex العربي",
    category: "DIGITAL",
    url: "https://fonts.google.com/specimen/IBM+Plex+Sans+Arabic",
    downloadUrl: "https://fonts.google.com/specimen/IBM+Plex+Sans+Arabic",
    description: "Open-source Arabic sans serif.",
    descriptionAr: "خط عربي مفتوح المصدر.",
    sortOrder: 21,
  },
  {
    type: "SOCIAL_TWITTER_TPL",
    name: "X / Twitter post template",
    nameAr: "قالب منشور تويتر / X",
    category: "SOCIAL",
    url: "/templates/twitter-template.svg",
    downloadUrl: "/templates/twitter-template.svg",
    description: "1600×900 dark-navy template.",
    descriptionAr: "قالب ١٦٠٠×٩٠٠ كحلي.",
    sortOrder: 30,
  },
  {
    type: "SOCIAL_INSTAGRAM_TPL",
    name: "Instagram post template",
    nameAr: "قالب منشور إنستغرام",
    category: "SOCIAL",
    url: "/templates/instagram-template.svg",
    downloadUrl: "/templates/instagram-template.svg",
    description: "1080×1080 gradient template.",
    descriptionAr: "قالب ١٠٨٠×١٠٨٠ بتدرج لوني.",
    sortOrder: 31,
  },
  {
    type: "SOCIAL_LINKEDIN_TPL",
    name: "LinkedIn banner",
    nameAr: "بانر لينكدإن",
    category: "SOCIAL",
    url: "/templates/linkedin-template.svg",
    downloadUrl: "/templates/linkedin-template.svg",
    description: "1584×396 ivory banner.",
    descriptionAr: "بانر ١٥٨٤×٣٩٦ بلون عاجي.",
    sortOrder: 32,
  },
  {
    type: "STATIONERY_LETTERHEAD",
    name: "Letterhead template",
    nameAr: "قالب ورقة رسمية",
    category: "PRINT",
    url: "/templates/letterhead-template.svg",
    downloadUrl: "/templates/letterhead-template.svg",
    description: "A4 print-ready letterhead.",
    descriptionAr: "ورقة رسمية A4 جاهزة للطباعة.",
    sortOrder: 40,
  },
];

async function main() {
  console.log(`Seeding ${ASSETS.length} brand kit assets…`);
  for (const a of ASSETS) {
    const existing = await prisma.brandKitAsset.findFirst({ where: { type: a.type } });
    if (existing) {
      await prisma.brandKitAsset.update({
        where: { id: existing.id },
        data: { ...a, isActive: true },
      });
    } else {
      await prisma.brandKitAsset.create({ data: { ...a, isActive: true } });
    }
    console.log(`  ✓ ${a.type}`);
  }
  console.log("✅ Brand kit seeded.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌", e);
  await prisma.$disconnect();
  process.exit(1);
});
