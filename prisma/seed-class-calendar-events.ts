/**
 * Sprint 3 — Calendar backfill for existing ClassSession rows.
 *
 * Looks at every ClassSession with scheduledDate >= now and creates a
 * CalendarEvent (type=CLASS) if not already present (matched by
 * metadata.sessionId on the event).
 *
 * Idempotent. Re-runnable.
 *
 * Run: npx tsx prisma/seed-class-calendar-events.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const sessions = await prisma.classSession.findMany({
    where: { scheduledDate: { gte: now } },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          nameAr: true,
          durationMinutes: true,
          teacherId: true,
        },
      },
    },
    orderBy: { scheduledDate: "asc" },
  });

  console.log(`Backfilling calendar events for ${sessions.length} sessions...`);
  let created = 0;
  let skipped = 0;

  for (const s of sessions) {
    // Look for an existing event for this session.
    const existing = await prisma.calendarEvent.findFirst({
      where: {
        type: "CLASS",
        classId: s.classId,
        startAt: s.scheduledDate,
      },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const duration = s.class.durationMinutes ?? 60;
    const endAt = new Date(s.scheduledDate.getTime() + duration * 60 * 1000);

    await prisma.calendarEvent.create({
      data: {
        type: "CLASS",
        title: s.class.name,
        titleAr: s.class.nameAr ?? s.class.name,
        startAt: s.scheduledDate,
        endAt,
        isGlobal: false,
        classId: s.classId,
        teacherId: s.class.teacherId,
        createdBy: "system",
        metadata: { sessionId: s.id },
      },
    });
    created += 1;
  }

  console.log(`✅ Created ${created}, skipped ${skipped} (already had event).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
