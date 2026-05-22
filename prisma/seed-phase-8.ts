/**
 * Phase 8 seed — finance email templates + a demo promo code.
 *
 * Run: npx tsx prisma/seed-phase-8.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://hajr-academy.vercel.app";

function btn(label: string, href: string) {
  return `<p style="margin:20px 0;"><a href="${href}" style="background:#C97B8A;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;">${label}</a></p>`;
}

const templates = [
  {
    key: "invoice_created",
    category: "TRANSACTIONAL" as const,
    subjectEn: "New invoice {{invoiceNumber}}",
    subjectAr: "فاتورة جديدة {{invoiceNumber}}",
    bodyEn: `<h2 style="color:#2C3E50;">New invoice</h2><p>Hi {{name}}, a new invoice <strong>{{invoiceNumber}}</strong> for <strong>{{amount}} SAR</strong> has been issued, due {{dueDate}}.</p>${btn("View invoice", `${APP}/en/student/billing`)}`,
    bodyAr: `<h2 style="color:#2C3E50;">فاتورة جديدة</h2><p>مرحباً {{name}}، صدرت فاتورة جديدة <strong>{{invoiceNumber}}</strong> بمبلغ <strong>{{amount}} ريال</strong>، مستحقة بتاريخ {{dueDate}}.</p>${btn("عرض الفاتورة", `${APP}/ar/student/billing`)}`,
    variables: ["name", "invoiceNumber", "amount", "dueDate"],
  },
  {
    key: "payment_failed",
    category: "TRANSACTIONAL" as const,
    subjectEn: "Payment failed — Invoice {{invoiceNumber}}",
    subjectAr: "تعذّر إتمام الدفع — الفاتورة {{invoiceNumber}}",
    bodyEn: `<h2 style="color:#E74C3C;">Payment failed</h2><p>Hi {{name}}, we could not charge <strong>{{amount}} SAR</strong> for invoice {{invoiceNumber}}. Please update your card and try again.</p>${btn("Retry payment", `${APP}/en/student/billing`)}`,
    bodyAr: `<h2 style="color:#E74C3C;">تعذّر إتمام الدفع</h2><p>مرحباً {{name}}، لم نتمكّن من تحصيل مبلغ <strong>{{amount}} ريال</strong> للفاتورة {{invoiceNumber}}. يُرجى تحديث بيانات بطاقتك وإعادة المحاولة.</p>${btn("إعادة المحاولة", `${APP}/ar/student/billing`)}`,
    variables: ["name", "invoiceNumber", "amount"],
  },
  {
    key: "subscription_cancelled",
    category: "TRANSACTIONAL" as const,
    subjectEn: "Your subscription has been cancelled",
    subjectAr: "تم إلغاء اشتراكك",
    bodyEn: `<h2 style="color:#2C3E50;">Subscription cancelled</h2><p>Hi {{name}}, your subscription has been cancelled. Your access continues until {{endDate}}. We will miss you — you are welcome back anytime.</p>`,
    bodyAr: `<h2 style="color:#2C3E50;">تم إلغاء الاشتراك</h2><p>مرحباً {{name}}، تم إلغاء اشتراكك. سيستمر وصولك حتى {{endDate}}. سنفتقدك — يسعدنا عودتك في أي وقت.</p>`,
    variables: ["name", "endDate"],
  },
  {
    key: "subscription_expiring",
    category: "TRANSACTIONAL" as const,
    subjectEn: "Your subscription renews in {{daysUntil}} days",
    subjectAr: "يتجدّد اشتراكك خلال {{daysUntil}} أيام",
    bodyEn: `<h2 style="color:#2C3E50;">Renewal coming up</h2><p>Hi {{name}}, your subscription renews on {{renewDate}} for <strong>{{amount}} SAR</strong>. Make sure your payment details are up to date.</p>${btn("Manage billing", `${APP}/en/student/billing`)}`,
    bodyAr: `<h2 style="color:#2C3E50;">تجديد قادم</h2><p>مرحباً {{name}}، سيتجدّد اشتراكك بتاريخ {{renewDate}} بمبلغ <strong>{{amount}} ريال</strong>. تأكّد من تحديث بيانات الدفع.</p>${btn("إدارة الفوترة", `${APP}/ar/student/billing`)}`,
    variables: ["name", "renewDate", "amount", "daysUntil"],
  },
];

async function main() {
  console.log("🌱 Seeding Phase 8 — finance email templates...");
  for (const tpl of templates) {
    await prisma.emailTemplate.upsert({
      where: { key: tpl.key },
      create: tpl,
      update: {
        subjectAr: tpl.subjectAr,
        subjectEn: tpl.subjectEn,
        bodyAr: tpl.bodyAr,
        bodyEn: tpl.bodyEn,
        variables: tpl.variables,
        category: tpl.category,
      },
    });
    console.log(`  ✓ ${tpl.key}`);
  }

  // A demo 50%-off promo code for testing the discount flow.
  await prisma.promoCode.upsert({
    where: { code: "HAJR50" },
    create: {
      code: "HAJR50",
      type: "PERCENTAGE",
      value: 50,
      maxUses: 100,
      maxUsesPerUser: 1,
      applicablePackages: [],
      applicablePrograms: [],
      startsAt: new Date("2026-01-01"),
      expiresAt: new Date("2027-12-31"),
      isActive: true,
      description: "50% off the first month — launch promo.",
      descriptionAr: "خصم ٥٠٪ على الشهر الأول — عرض الإطلاق.",
    },
    update: {},
  });
  console.log("  ✓ promo code HAJR50");

  console.log(`✅ Phase 8 seed complete — ${templates.length} templates + 1 promo.`);
}

main()
  .catch((e) => {
    console.error("❌ Phase 8 seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
