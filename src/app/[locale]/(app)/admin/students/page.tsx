import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { StudentsClient } from "./_components/students-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; gender?: string; package?: string; school?: string; grade?: string; age?: string; page?: string; sort?: string; dir?: string }>;
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
  const grades = (sp.grade ?? "").split(",").filter(Boolean);
  const ageRanges = (sp.age ?? "").split(",").filter(Boolean);
  const schoolFilter = sp.school?.trim() || undefined;

  // Age range -> birthDate bounds. For age N, birthDate in (today-(N+1)y, today-Ny].
  const AGE_BOUNDS: Record<string, [number, number | null]> = {
    "6-9": [6, 9],
    "10-12": [10, 12],
    "13-15": [13, 15],
    "16-18": [16, 18],
    "18+": [18, null],
  };
  function ageRangeToBirthFilter(min: number, max: number | null) {
    const now = new Date();
    // At least `min` years old => born on or before (today - min years).
    const lte = new Date(now.getFullYear() - min, now.getMonth(), now.getDate());
    if (max === null) return { lte };
    // At most `max` years old => born after (today - (max+1) years).
    const gte = new Date(now.getFullYear() - (max + 1), now.getMonth(), now.getDate());
    return { gte, lte };
  }
  const ageOr = ageRanges
    .map((r) => AGE_BOUNDS[r])
    .filter(Boolean)
    .map(([min, max]) => ({ birthDate: ageRangeToBirthFilter(min, max) }));

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
  if (grades.length) profileWhere.gradeLevel = { in: grades };
  if (ageOr.length) profileWhere.OR = ageOr;
  if (schoolFilter) profileWhere.schoolId = schoolFilter;
  if (Object.keys(profileWhere).length) where.studentProfile = { is: profileWhere };

  const sortField = sp.sort ?? "createdAt";
  const sortDir = (sp.dir ?? "desc") === "asc" ? "asc" : "desc";

  let total = 0;
  let data: any[] = [];
  let schools: any[] = [];
  let gradeOptions: string[] = [];

  try {
    const [_total, rows, _schools, _grades] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { studentProfile: { include: { school: { select: { nameEn: true, nameAr: true } } } } },
        orderBy: { [sortField]: sortDir } as any,
        skip,
        take: PAGE_SIZE,
      }),
      prisma.partnerSchool.findMany({ select: { id: true, nameEn: true, nameAr: true } }),
      prisma.studentProfile.findMany({
        where: { gradeLevel: { not: null } },
        select: { gradeLevel: true },
        distinct: ["gradeLevel"],
        orderBy: { gradeLevel: "asc" },
      }),
    ]);
    total = _total;
    schools = _schools;
    gradeOptions = _grades.map((g) => g.gradeLevel).filter((g): g is string => !!g);
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
            subscriptionDate: u.studentProfile.subscriptionDate?.toISOString() ?? null,
            importantNotes: u.studentProfile.importantNotes,
            studentPhone: u.studentProfile.studentPhone,
            guardianName: u.studentProfile.guardianName,
            guardianPhone: u.studentProfile.guardianPhone,
            residenceAddress: u.studentProfile.residenceAddress,
            englishTeacherName: u.studentProfile.englishTeacherName,
            profileId: u.studentProfile.id,
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
      gradeOptions={gradeOptions}
    />
  );
}
