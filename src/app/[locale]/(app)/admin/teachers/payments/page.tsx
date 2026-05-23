import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { AdminPaymentsClient, type EarningRow } from "./admin-payments-client";

export const dynamic = "force-dynamic";

export default async function AdminTeacherPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; teacherId?: string; from?: string; to?: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const sp = await searchParams;
  const t = await getTranslations();

  const status = (sp.status ?? "PENDING").toUpperCase();
  const where: any = {};
  if (["PENDING", "APPROVED", "PAID"].includes(status)) {
    where.status = status;
  }
  if (sp.teacherId) where.teacherId = sp.teacherId;
  if (sp.from || sp.to) {
    where.createdAt = {};
    if (sp.from) where.createdAt.gte = new Date(sp.from);
    if (sp.to) where.createdAt.lte = new Date(sp.to);
  }

  const earnings = await prisma.teacherEarning.findMany({
    where,
    include: {
      teacher: {
        include: { user: { select: { name: true, nameAr: true, email: true } } },
      },
      classSession: {
        include: { class: { select: { name: true, nameAr: true, cohortCode: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const rows: EarningRow[] = earnings.map((e) => ({
    id: e.id,
    teacherId: e.teacherId,
    teacherName: e.teacher.user.nameAr ?? e.teacher.user.name,
    teacherEmail: e.teacher.user.email,
    className: e.classSession?.class
      ? e.classSession.class.nameAr ?? e.classSession.class.name
      : "—",
    cohortCode: e.classSession?.class?.cohortCode ?? null,
    date: (e.classSession?.scheduledDate ?? e.createdAt).toISOString(),
    hoursWorked: Number(e.hoursWorked),
    hourlyRate: Number(e.hourlyRate),
    amount: Number(e.amount),
    status: e.status as "PENDING" | "APPROVED" | "PAID",
  }));

  const teachers = await prisma.teacherProfile.findMany({
    where: { active: true },
    include: { user: { select: { name: true, nameAr: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("AdminPay.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("AdminPay.subtitle")}</p>
      </div>

      <AdminPaymentsClient
        rows={rows}
        teachers={teachers.map((t) => ({
          id: t.id,
          name: t.user.nameAr ?? t.user.name,
          hourlyRate: Number(t.hourlyRate),
        }))}
        currentStatus={status}
      />
    </div>
  );
}
