import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/today-classes
 * Class sessions scheduled for today (Asia/Riyadh civil day),
 * with derived display status (LIVE / SOON / LATER).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  // Day window in Asia/Riyadh (UTC+3, no DST).
  const now = new Date();
  // shift "now" to Riyadh wall-clock, then truncate to start of day, then shift back to UTC.
  const RIYADH_OFFSET_MIN = 3 * 60;
  const wall = new Date(now.getTime() + RIYADH_OFFSET_MIN * 60_000);
  wall.setUTCHours(0, 0, 0, 0);
  const dayStartUtc = new Date(wall.getTime() - RIYADH_OFFSET_MIN * 60_000);
  const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 3600_000);

  const sessions = await prisma.classSession.findMany({
    where: {
      scheduledDate: { gte: dayStartUtc, lt: dayEndUtc },
      status: { in: ["SCHEDULED", "LIVE", "COMPLETED"] },
    },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          nameAr: true,
          cohortCode: true,
          durationMinutes: true,
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
          teacher: { include: { user: { select: { name: true, nameAr: true } } } },
        },
      },
    },
    orderBy: { scheduledDate: "asc" },
    take: 20,
  });

  const items = sessions.map((s) => {
    const start = s.scheduledDate.getTime();
    const end = start + s.class.durationMinutes * 60_000;
    let status: "LIVE" | "SOON" | "LATER" | "DONE" = "LATER";
    if (s.status === "LIVE" || (start <= now.getTime() && now.getTime() <= end)) {
      status = "LIVE";
    } else if (s.status === "COMPLETED" || end < now.getTime()) {
      status = "DONE";
    } else if (start - now.getTime() <= 30 * 60_000) {
      status = "SOON";
    }
    return {
      id: s.id,
      classId: s.class.id,
      className: s.class.nameAr ?? s.class.name,
      classNameEn: s.class.name,
      cohortCode: s.class.cohortCode,
      teacherName: s.class.teacher.user.nameAr ?? s.class.teacher.user.name,
      scheduledStartAt: s.scheduledDate.toISOString(),
      durationMinutes: s.class.durationMinutes,
      studentCount: s.class._count.enrollments,
      status,
      sessionStatus: s.status,
    };
  });

  return NextResponse.json({ items });
}
