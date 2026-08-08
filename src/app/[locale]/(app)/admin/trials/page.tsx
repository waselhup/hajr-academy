import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getLocale } from "next-intl/server";
import { dayLabel, timeLabel, HOLDING_STATUSES } from "@/lib/trials/slots";
import { TrialsClient } from "./_components/trials-client";
import { TrialSlotsClient, type AdminSlot } from "./_components/trial-slots-client";

export const dynamic = "force-dynamic";

export default async function AdminTrialsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const locale = await getLocale();
  const isAr = locale === "ar";

  let data: any[] = [];
  let slots: AdminSlot[] = [];

  try {
    const trials = await prisma.trialRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
    data = trials.map((tr) => ({
      id: tr.id,
      name: tr.name,
      phone: tr.phone,
      email: tr.email,
      childGrade: tr.childGrade,
      preferredProgram: tr.preferredProgram,
      preferredTime: tr.preferredTime,
      notes: tr.notes,
      source: tr.source,
      status: tr.status,
      assignedTo: tr.assignedTo,
      followUpAt: tr.followUpAt?.toISOString() ?? null,
      convertedToStudentId: tr.convertedToStudentId,
      createdAt: tr.createdAt.toISOString(),
      updatedAt: tr.updatedAt.toISOString(),
    }));
  } catch (e) {
    console.error("[admin-trials] requests query failed:", e);
  }

  try {
    // Recent past slots stay in the query so the page can filter them out
    // client-side without a second round trip.
    const since = new Date(Date.now() - 7 * 86_400_000);
    const rows = await prisma.trialSlot.findMany({
      where: { startsAt: { gte: since } },
      orderBy: { startsAt: "asc" },
      take: 200,
      include: {
        _count: {
          select: { requests: { where: { status: { in: [...HOLDING_STATUSES] } } } },
        },
      },
    });
    const now = Date.now();
    slots = rows.map((s) => ({
      id: s.id,
      startsAt: s.startsAt.toISOString(),
      durationMinutes: s.durationMinutes,
      capacity: s.capacity,
      booked: s._count.requests,
      isActive: s.isActive,
      note: s.note,
      dayLabel: dayLabel(s.startsAt, isAr),
      timeLabel: timeLabel(s.startsAt, s.durationMinutes, isAr),
      isPast: s.startsAt.getTime() < now,
    }));
  } catch (e) {
    console.error("[admin-trials] slots query failed:", e);
  }

  return (
    <div className="space-y-6">
      <TrialSlotsClient slots={slots} />
      <TrialsClient rows={data} />
    </div>
  );
}
