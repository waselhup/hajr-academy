import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { OrdersClient } from "./_components/orders-client";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { locale } = await params;

  let orders: any[] = [];
  let classes: { id: string; label: string; gender: string | null; full: boolean }[] = [];
  let schools: { id: string; name: string }[] = [];

  try {
    const [_orders, _classes, _schools] = await Promise.all([
      prisma.purchaseOrder.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.class.findMany({
        where: { status: { in: ["DRAFT", "ACTIVE"] } },
        select: {
          id: true,
          name: true,
          nameAr: true,
          cohortCode: true,
          genderRestriction: true,
          maxStudents: true,
          _count: { select: { enrollments: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.partnerSchool.findMany({
        where: { active: true },
        select: { id: true, nameEn: true, nameAr: true },
        orderBy: { nameEn: "asc" },
      }),
    ]);

    orders = _orders.map((o) => ({
      id: o.id,
      studentName: o.studentName,
      phone: o.phone,
      email: o.email,
      packageType: o.packageType,
      notes: o.notes,
      amountSar: o.amountSar.toString(),
      paymentStatus: o.paymentStatus,
      status: o.status,
      provisionedStudentId: o.provisionedStudentId,
      createdAt: o.createdAt.toISOString(),
    }));
    classes = _classes.map((c) => ({
      id: c.id,
      label: `${c.cohortCode} · ${c.nameAr ?? c.name}`,
      gender: c.genderRestriction,
      full: c._count.enrollments >= c.maxStudents,
    }));
    schools = _schools.map((s) => ({ id: s.id, name: locale === "ar" ? s.nameAr : s.nameEn }));
  } catch (e) {
    console.error("[admin-orders] DB query failed:", e);
  }

  return <OrdersClient locale={locale} orders={orders} classes={classes} schools={schools} />;
}
