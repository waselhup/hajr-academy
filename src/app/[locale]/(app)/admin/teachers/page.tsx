import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { TeachersClient } from "./_components/teachers-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminTeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; spec?: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const q = (sp.q ?? "").trim();
  const status = sp.status;
  const spec = sp.spec;

  const where: any = { role: "TEACHER" };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }
  if (status === "active") where.isActive = true;
  if (status === "inactive") where.isActive = false;
  if (spec) where.teacherProfile = { is: { specializations: { has: spec } } };

  let total = 0;
  let data: any[] = [];

  try {
    const [_total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { teacherProfile: { include: { _count: { select: { classes: true } } } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);
    total = _total;
    data = rows.map((u) => ({
      id: u.id,
      name: u.name,
      nameAr: u.nameAr,
      email: u.email,
      phone: u.phone,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      profile: u.teacherProfile
        ? {
            id: u.teacherProfile.id,
            bio: u.teacherProfile.bio,
            specializations: u.teacherProfile.specializations,
            salaryBase: u.teacherProfile.salaryBase.toString(),
            hourlyRate: u.teacherProfile.hourlyRate.toString(),
            salaryBaseUsd: u.teacherProfile.salaryBaseUsd?.toString() ?? null,
            hourlyRateUsd: u.teacherProfile.hourlyRateUsd?.toString() ?? null,
            zoomHostEmail: u.teacherProfile.zoomHostEmail,
            ageGroup: u.teacherProfile.ageGroup,
            availabilityDays: u.teacherProfile.availabilityDays,
            availabilityHours: u.teacherProfile.availabilityHours,
            rating: u.teacherProfile.rating?.toString() ?? null,
            totalStudents: u.teacherProfile.totalStudents,
            classCount: u.teacherProfile._count.classes,
          }
        : null,
    }));
  } catch (e) {
    console.error("[admin-teachers] DB query failed:", e);
  }

  return <TeachersClient rows={data} total={total} page={page} pageSize={PAGE_SIZE} />;
}
