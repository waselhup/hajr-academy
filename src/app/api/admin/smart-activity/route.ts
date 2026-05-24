import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SmartActivityType =
  | "PAYMENT_RECEIVED"
  | "STUDENT_REGISTERED"
  | "TRIAL_REQUESTED"
  | "CLASS_STARTED"
  | "INVOICE_OVERDUE"
  | "CONTACT_SUBMITTED"
  | "TEACHER_EARNING_APPROVED";

interface SmartActivityItem {
  id: string;
  type: SmartActivityType;
  time: string;
  href: string;
  data: Record<string, string | number>;
}

/**
 * GET /api/admin/smart-activity?limit=8
 * Curated, business-meaningful events — NOT raw audit log noise.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const limit = Math.min(
    20,
    Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "8", 10))
  );

  const since = new Date(Date.now() - 7 * 86400_000);

  const [
    payments,
    newStudents,
    trials,
    classesStarted,
    overdueInvoices,
    contacts,
    earningsApproved,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: "PAID", paidAt: { gte: since, not: null } },
      select: {
        id: true,
        totalSar: true,
        paidAt: true,
        student: {
          select: { user: { select: { name: true, nameAr: true } } },
        },
      },
      orderBy: { paidAt: "desc" },
      take: limit,
    }),
    prisma.user.findMany({
      where: { role: "STUDENT", createdAt: { gte: since } },
      select: { id: true, name: true, nameAr: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.trialRequest.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.classSession.findMany({
      where: { startedAt: { gte: since, not: null } },
      select: {
        id: true,
        startedAt: true,
        class: { select: { name: true, nameAr: true } },
      },
      orderBy: { startedAt: "desc" },
      take: limit,
    }),
    prisma.invoice.findMany({
      where: {
        OR: [
          { status: "OVERDUE" },
          { status: "PENDING", dueDate: { lt: new Date() } },
        ],
        updatedAt: { gte: since },
      },
      select: { id: true, totalSar: true, dueDate: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.contactSubmission.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.teacherEarning.findMany({
      where: { status: { in: ["APPROVED", "PAID"] }, approvedAt: { gte: since, not: null } },
      select: { id: true, amount: true, approvedAt: true },
      orderBy: { approvedAt: "desc" },
      take: limit,
    }),
  ]);

  const items: SmartActivityItem[] = [];

  for (const p of payments) {
    items.push({
      id: `pay-${p.id}`,
      type: "PAYMENT_RECEIVED",
      time: (p.paidAt ?? new Date()).toISOString(),
      href: `/admin/finance`,
      data: {
        amount: Number(p.totalSar),
        name: p.student.user.nameAr ?? p.student.user.name,
      },
    });
  }
  for (const s of newStudents) {
    items.push({
      id: `stud-${s.id}`,
      type: "STUDENT_REGISTERED",
      time: s.createdAt.toISOString(),
      href: `/admin/students`,
      data: { name: s.nameAr ?? s.name },
    });
  }
  for (const tr of trials) {
    items.push({
      id: `trial-${tr.id}`,
      type: "TRIAL_REQUESTED",
      time: tr.createdAt.toISOString(),
      href: `/admin/trials`,
      data: { name: tr.name },
    });
  }
  for (const cs of classesStarted) {
    items.push({
      id: `cls-${cs.id}`,
      type: "CLASS_STARTED",
      time: (cs.startedAt ?? new Date()).toISOString(),
      href: `/admin/live`,
      data: { class: cs.class.nameAr ?? cs.class.name },
    });
  }
  for (const inv of overdueInvoices) {
    items.push({
      id: `od-${inv.id}`,
      type: "INVOICE_OVERDUE",
      time: inv.updatedAt.toISOString(),
      href: `/admin/finance`,
      data: { amount: Number(inv.totalSar) },
    });
  }
  for (const c of contacts) {
    items.push({
      id: `ct-${c.id}`,
      type: "CONTACT_SUBMITTED",
      time: c.createdAt.toISOString(),
      href: `/admin/communications/contacts`,
      data: { name: c.name },
    });
  }
  for (const e of earningsApproved) {
    items.push({
      id: `te-${e.id}`,
      type: "TEACHER_EARNING_APPROVED",
      time: (e.approvedAt ?? new Date()).toISOString(),
      href: `/admin/teachers/payments`,
      data: { amount: Number(e.amount) },
    });
  }

  items.sort((a, b) => (a.time < b.time ? 1 : -1));

  return NextResponse.json({ items: items.slice(0, limit) });
}
