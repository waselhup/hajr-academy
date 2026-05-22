/**
 * Phase 9 seed — parent + class-start email templates.
 *
 * Run: npx tsx prisma/seed-phase-9.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  {
    key: "class_started_student",
    category: "TRANSACTIONAL" as const,
    subjectEn: "Your class has started! — {{className}}",
    subjectAr: "حصتك بدأت الآن! — {{className}}",
    bodyEn: `<h2 style="color:#2C3E50;">Your class has started!</h2><p>Hi {{name}}, join your <strong>{{className}}</strong> class now.</p>`,
    bodyAr: `<h2 style="color:#2C3E50;">حصتك بدأت الآن!</h2><p>مرحباً {{name}}، انضم إلى حصة <strong>{{className}}</strong> الآن.</p>`,
    variables: ["name", "className"],
  },
  {
    key: "class_started_parent",
    category: "TRANSACTIONAL" as const,
    subjectEn: "{{studentName}}'s class has started",
    subjectAr: "حصة {{studentName}} بدأت الآن",
    bodyEn: `<h2 style="color:#2C3E50;">Class started</h2><p>Hi {{name}}, {{studentName}}'s <strong>{{className}}</strong> class has just started.</p>`,
    bodyAr: `<h2 style="color:#2C3E50;">حصة بدأت الآن</h2><p>مرحباً {{name}}، بدأت حصة <strong>{{className}}</strong> الخاصة بـ {{studentName}}.</p>`,
    variables: ["name", "studentName", "className"],
  },
  {
    key: "student_transferred",
    category: "TRANSACTIONAL" as const,
    subjectEn: "You have been moved to a new class — {{className}}",
    subjectAr: "تم نقلك إلى فصل جديد — {{className}}",
    bodyEn: `<h2 style="color:#2C3E50;">Moved to a new class</h2><p>Hi {{name}}, you have been moved to <strong>{{className}}</strong>. Check your updated schedule on your dashboard.</p>`,
    bodyAr: `<h2 style="color:#2C3E50;">نقل إلى فصل جديد</h2><p>مرحباً {{name}}، تم نقلك إلى فصل <strong>{{className}}</strong>. اطّلع على جدولك الجديد من لوحتك.</p>`,
    variables: ["name", "className"],
  },
  {
    key: "student_transferred_parent",
    category: "TRANSACTIONAL" as const,
    subjectEn: "{{studentName}} has been moved to a new class",
    subjectAr: "تم نقل {{studentName}} إلى فصل جديد",
    bodyEn: `<h2 style="color:#2C3E50;">Moved to a new class</h2><p>Hi {{name}}, {{studentName}} has been moved to <strong>{{className}}</strong>.</p>`,
    bodyAr: `<h2 style="color:#2C3E50;">نقل إلى فصل جديد</h2><p>مرحباً {{name}}، تم نقل {{studentName}} إلى فصل <strong>{{className}}</strong>.</p>`,
    variables: ["name", "studentName", "className"],
  },
];

async function main() {
  console.log("🌱 Seeding Phase 9 — parent + class-start templates...");
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
  console.log(`✅ Phase 9 seed complete — ${templates.length} templates.`);
}

main()
  .catch((e) => {
    console.error("❌ Phase 9 seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
