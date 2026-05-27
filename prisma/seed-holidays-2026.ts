/**
 * Seed Saudi national holidays (2026-2027) as global, type=HOLIDAY events.
 *
 * Idempotent: skips a row if a holiday with the same titleAr + same year is
 * already present.
 *
 * Run: npx tsx prisma/seed-holidays-2026.ts
 */
import { PrismaClient } from "@prisma/client";

interface Holiday {
  date: string; // YYYY-MM-DD
  titleAr: string;
  title: string;
}

const HOLIDAYS: Holiday[] = [
  { date: "2026-02-22", titleAr: "يوم التأسيس",           title: "Founding Day" },
  { date: "2026-03-20", titleAr: "بداية رمضان (تقديري)",  title: "Ramadan begins (est.)" },
  { date: "2026-04-19", titleAr: "عيد الفطر (تقديري)",    title: "Eid al-Fitr (est.)" },
  { date: "2026-06-26", titleAr: "يوم عرفة (تقديري)",     title: "Day of Arafah (est.)" },
  { date: "2026-06-27", titleAr: "عيد الأضحى (تقديري)",   title: "Eid al-Adha (est.)" },
  { date: "2026-09-23", titleAr: "اليوم الوطني",          title: "National Day" },
  { date: "2027-02-22", titleAr: "يوم التأسيس",           title: "Founding Day" },
  { date: "2027-09-23", titleAr: "اليوم الوطني",          title: "National Day" },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    // We need a createdBy — use any active admin, or fall back to "system".
    const admin = await prisma.user.findFirst({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
      select: { id: true },
    });
    const createdBy = admin?.id ?? "system";

    let inserted = 0;
    let skipped = 0;
    for (const h of HOLIDAYS) {
      const startAt = new Date(`${h.date}T00:00:00.000Z`);
      const endAt = new Date(`${h.date}T23:59:59.999Z`);
      const year = startAt.getUTCFullYear();
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

      const existing = await prisma.calendarEvent.findFirst({
        where: {
          titleAr: h.titleAr,
          type: "HOLIDAY",
          startAt: { gte: startOfYear, lte: endOfYear },
        },
      });
      if (existing) { skipped++; continue; }

      await prisma.calendarEvent.create({
        data: {
          type: "HOLIDAY",
          title: h.title,
          titleAr: h.titleAr,
          startAt,
          endAt,
          allDay: true,
          isGlobal: true,
          createdBy,
        },
      });
      inserted++;
    }
    console.log(`✅ Holidays seeded — inserted=${inserted} skipped=${skipped}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ Holiday seed failed:", e);
  process.exit(1);
});
