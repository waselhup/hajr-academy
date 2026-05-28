import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { fmtRiyadh } from "@/lib/format";
import { AdminCommandCenter, type DashboardPayload } from "./_components/admin-command-center";
import { MoatCards } from "@/components/shell/moat-cards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RIYADH_OFFSET_MIN = 3 * 60;

function riyadhDayWindow(now: Date) {
  const wall = new Date(now.getTime() + RIYADH_OFFSET_MIN * 60_000);
  wall.setUTCHours(0, 0, 0, 0);
  const start = new Date(wall.getTime() - RIYADH_OFFSET_MIN * 60_000);
  const end = new Date(start.getTime() + 24 * 3600_000);
  return { start, end };
}

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: "ar" | "en" }>;
}) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const { locale } = await params;
  const t = await getTranslations();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400_000);
  const { start: dayStart, end: dayEnd } = riyadhDayWindow(now);

  const dayBuckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return { start: new Date(d), end: new Date(d.getTime() + 86400_000) };
  });

  let payload: DashboardPayload = {
    name: session.user.name ?? "",
    today: now.toISOString(),
    monthRevenue: { value: 0, delta: 0, sparkline: [0, 0, 0, 0, 0, 0, 0] },
    activeStudents: { value: 0, newThisWeek: 0, sparkline: [0, 0, 0, 0, 0, 0, 0] },
    liveClasses: { value: 0 },
    monthlyClassCount: { value: 0, delta: 0, sparkline: [0, 0, 0, 0, 0, 0, 0] },
    alerts: {
      total: 0,
      newContactRequests: 0,
      pendingPayments: 0,
      overdueInvoices: 0,
      flaggedMessages: 0,
      newTrials: 0,
    },
    todayClasses: [],
    activity: [],
  };

  try {
    const [
      revenueThisMonth,
      revenuePrevMonth,
      activeStudents,
      newStudentsThisWeek,
      liveCount,
      classesThisMonth,
      classesPrevMonth,
      paymentsLast7,
      newStudentsLast7,
      classesLast7,
      newContactRequests,
      pendingPayments,
      overdueInvoices,
      flaggedMessages,
      newTrials,
      todaySessions,
      payments,
      newStudents,
      trials,
      classesStarted,
      contacts,
      earningsApproved,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        _sum: { totalSar: true },
        where: { status: "PAID", paidAt: { gte: monthStart } },
      }),
      prisma.invoice.aggregate({
        _sum: { totalSar: true },
        where: {
          status: "PAID",
          paidAt: { gte: prevMonthStart, lte: prevMonthEnd },
        },
      }),
      prisma.studentProfile.count({ where: { user: { isActive: true } } }),
      prisma.user.count({
        where: { role: "STUDENT", isActive: true, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.classSession.count({ where: { status: "LIVE" } }),
      prisma.classSession.count({
        where: { status: { in: ["COMPLETED", "LIVE"] }, scheduledDate: { gte: monthStart } },
      }),
      prisma.classSession.count({
        where: {
          status: { in: ["COMPLETED", "LIVE"] },
          scheduledDate: { gte: prevMonthStart, lte: prevMonthEnd },
        },
      }),
      Promise.all(
        dayBuckets.map((b) =>
          prisma.invoice.aggregate({
            _sum: { totalSar: true },
            where: { status: "PAID", paidAt: { gte: b.start, lt: b.end } },
          })
        )
      ),
      Promise.all(
        dayBuckets.map((b) =>
          prisma.user.count({
            where: { role: "STUDENT", createdAt: { gte: b.start, lt: b.end } },
          })
        )
      ),
      Promise.all(
        dayBuckets.map((b) =>
          prisma.classSession.count({
            where: {
              status: { in: ["COMPLETED", "LIVE"] },
              scheduledDate: { gte: b.start, lt: b.end },
            },
          })
        )
      ),
      prisma.contactSubmission.count({ where: { status: "NEW" } }),
      prisma.teacherEarning.count({ where: { status: "PENDING" } }),
      prisma.invoice.count({
        where: {
          OR: [
            { status: "OVERDUE" },
            { status: "PENDING", dueDate: { lt: now } },
          ],
        },
      }),
      prisma.message.count({ where: { flagged: true } }),
      prisma.trialRequest.count({ where: { status: "NEW" } }),
      prisma.classSession.findMany({
        where: {
          scheduledDate: { gte: dayStart, lt: dayEnd },
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
        take: 8,
      }),
      prisma.invoice.findMany({
        where: { status: "PAID", paidAt: { gte: sevenDaysAgo, not: null } },
        select: {
          id: true,
          totalSar: true,
          paidAt: true,
          student: { select: { user: { select: { name: true, nameAr: true } } } },
        },
        orderBy: { paidAt: "desc" },
        take: 8,
      }),
      prisma.user.findMany({
        where: { role: "STUDENT", createdAt: { gte: sevenDaysAgo } },
        select: { id: true, name: true, nameAr: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.trialRequest.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { id: true, name: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.classSession.findMany({
        where: { startedAt: { gte: sevenDaysAgo, not: null } },
        select: {
          id: true,
          startedAt: true,
          class: { select: { name: true, nameAr: true } },
        },
        orderBy: { startedAt: "desc" },
        take: 8,
      }),
      prisma.contactSubmission.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { id: true, name: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.teacherEarning.findMany({
        where: {
          status: { in: ["APPROVED", "PAID"] },
          approvedAt: { gte: sevenDaysAgo, not: null },
        },
        select: { id: true, amount: true, approvedAt: true },
        orderBy: { approvedAt: "desc" },
        take: 8,
      }),
    ]);

    const mr = Number(revenueThisMonth._sum.totalSar ?? 0);
    const prevMr = Number(revenuePrevMonth._sum.totalSar ?? 0);
    const revenueDelta = prevMr > 0 ? Math.round(((mr - prevMr) / prevMr) * 100) : 0;
    const classesDelta =
      classesPrevMonth > 0
        ? Math.round(((classesThisMonth - classesPrevMonth) / classesPrevMonth) * 100)
        : 0;

    const todayClasses = todaySessions.map((s) => {
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
        className:
          locale === "ar" ? s.class.nameAr ?? s.class.name : s.class.name,
        cohortCode: s.class.cohortCode,
        teacherName:
          locale === "ar"
            ? s.class.teacher.user.nameAr ?? s.class.teacher.user.name
            : s.class.teacher.user.name,
        scheduledStartAt: s.scheduledDate.toISOString(),
        studentCount: s.class._count.enrollments,
        status,
      };
    });

    const activity: DashboardPayload["activity"] = [];
    for (const p of payments) {
      activity.push({
        id: `pay-${p.id}`,
        type: "PAYMENT_RECEIVED",
        time: (p.paidAt ?? now).toISOString(),
        href: `/${locale}/admin/finance`,
        data: {
          amount: Number(p.totalSar),
          name:
            locale === "ar"
              ? p.student.user.nameAr ?? p.student.user.name
              : p.student.user.name,
        },
      });
    }
    for (const s of newStudents) {
      activity.push({
        id: `stud-${s.id}`,
        type: "STUDENT_REGISTERED",
        time: s.createdAt.toISOString(),
        href: `/${locale}/admin/students`,
        data: { name: locale === "ar" && s.nameAr ? s.nameAr : s.name },
      });
    }
    for (const tr of trials) {
      activity.push({
        id: `trial-${tr.id}`,
        type: "TRIAL_REQUESTED",
        time: tr.createdAt.toISOString(),
        href: `/${locale}/admin/trials`,
        data: { name: tr.name },
      });
    }
    for (const cs of classesStarted) {
      activity.push({
        id: `cls-${cs.id}`,
        type: "CLASS_STARTED",
        time: (cs.startedAt ?? now).toISOString(),
        href: `/${locale}/admin/live`,
        data: {
          class:
            locale === "ar" ? cs.class.nameAr ?? cs.class.name : cs.class.name,
        },
      });
    }
    for (const c of contacts) {
      activity.push({
        id: `ct-${c.id}`,
        type: "CONTACT_SUBMITTED",
        time: c.createdAt.toISOString(),
        href: `/${locale}/admin/communications/contacts`,
        data: { name: c.name },
      });
    }
    for (const e of earningsApproved) {
      activity.push({
        id: `te-${e.id}`,
        type: "TEACHER_EARNING_APPROVED",
        time: (e.approvedAt ?? now).toISOString(),
        href: `/${locale}/admin/teachers/payments`,
        data: { amount: Number(e.amount) },
      });
    }
    activity.sort((a, b) => (a.time < b.time ? 1 : -1));

    payload = {
      name: session.user.name ?? "",
      today: now.toISOString(),
      monthRevenue: {
        value: mr,
        delta: revenueDelta,
        sparkline: paymentsLast7.map((a) => Number(a._sum.totalSar ?? 0)),
      },
      activeStudents: {
        value: activeStudents,
        newThisWeek: newStudentsThisWeek,
        sparkline: newStudentsLast7,
      },
      liveClasses: { value: liveCount },
      monthlyClassCount: {
        value: classesThisMonth,
        delta: classesDelta,
        sparkline: classesLast7,
      },
      alerts: {
        total:
          newContactRequests +
          pendingPayments +
          overdueInvoices +
          flaggedMessages +
          newTrials,
        newContactRequests,
        pendingPayments,
        overdueInvoices,
        flaggedMessages,
        newTrials,
      },
      todayClasses,
      activity: activity.slice(0, 8),
    };
  } catch (e) {
    console.error("[admin-dashboard] DB query failed:", e);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">
          {t("AdminDashboard.greeting", { name: payload.name })}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {fmtRiyadh(now, "EEEE, MMM d yyyy")}
        </p>
      </div>
      <AdminCommandCenter locale={locale} payload={payload} />
      <MoatCards role="admin" locale={locale} />
    </div>
  );
}
