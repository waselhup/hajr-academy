import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { StudentsClient } from "./_components/students-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; gender?: string; package?: string; school?: string; page?: string; sort?: string; dir?: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const q = (sp.q ?? "").trim();
  const levels = (sp.level ?? "").split(",").filter(Boolean);
  const genders = (sp.gender ?? "").split(",").filter(Boolean);
  const packages = (sp.package ?? "").split(",").filter(Boolean);
  const schoolFilter = sp.school?.trim() || undefined;

  const where: any = { role: "STUDENT" };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { nameAr: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }
  const profileWhere: any = {};
  if (levels.length) profileWhere.englishLevel = { in: levels };
  if (genders.length) profileWhere.gender = { in: genders };
  if (packages.length) profileWhere.activePackage = { in: packages };
  if (schoolFilter) profileWhere.schoolId = schoolFilter;
  if (Object.keys(profileWhere).length) where.studentProfile = { is: profileWhere };

  const sortField = sp.sort ?? "createdAt";
  const sortDir = (sp.dir ?? "desc") === "asc" ? "asc" : "desc";

  let total = 0;
  let data: any[] = [];
  let schools: any[] = [];

  try {
    const [_total, rows, _schools] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { studentProfile: { include: { school: { select: { nameEn: true, nameAr: true } } } } },
        orderBy: { [sortField]: sortDir } as any,
        skip,
        take: PAGE_SIZE,
      }),
      prisma.partnerSchool.findMany({ select: { id: true, nameEn: true, nameAr: true } }),
    ]);
    total = _total;
    schools = _schools;
    data = rows.map((u) => ({
      id: u.id,
      name: u.name,
      nameAr: u.nameAr,
      email: u.email,
      phone: u.phone,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      profile: u.studentProfile
        ? {
            birthDate: u.studentProfile.birthDate?.toISOString() ?? null,
            gradeLevel: u.studentProfile.gradeLevel,
            englishLevel: u.studentProfile.englishLevel,
            gender: u.studentProfile.gender,
            schoolName: u.studentProfile.school?.nameEn ?? null,
            schoolId: u.studentProfile.schoolId ?? null,
            activePackage: u.studentProfile.activePackage,
            packageStartedAt: u.studentProfile.packageStartedAt?.toISOString() ?? null,
            packageExpiresAt: u.studentProfile.packageExpiresAt?.toISOString() ?? null,
          }
        : null,
    }));
  } catch (e) {
    console.error("[admin-students] DB query failed:", e);
  }

  return (
    <StudentsClient
      rows={data}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      schools={schools.map((s) => ({ id: s.id, name: s.nameEn }))}
    />
  );
}
