import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { SchoolsClient } from "./_components/schools-client";

export const dynamic = "force-dynamic";

export default async function AdminSchoolsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  let rows: any[] = [];

  try {
    const schools = await prisma.partnerSchool.findMany({
      include: { _count: { select: { students: true } } },
      orderBy: { createdAt: "desc" },
    });
    rows = schools.map((s) => ({
      id: s.id,
      nameEn: s.nameEn,
      nameAr: s.nameAr,
      contactName: s.contactName,
      contactEmail: s.contactEmail,
      contactPhone: s.contactPhone,
      city: s.city,
      contractStart: s.contractStart.toISOString().slice(0, 10),
      contractEnd: s.contractEnd.toISOString().slice(0, 10),
      monthlyFeeSar: s.monthlyFeeSar.toString(),
      studentCap: s.studentCap,
      active: s.active,
      students: s._count.students,
    }));
  } catch (e) {
    console.error("[admin-schools] DB query failed:", e);
  }

  return <SchoolsClient rows={rows} />;
}
