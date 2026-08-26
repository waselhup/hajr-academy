import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { StudentsClient } from "./_components/students-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export type PaymentState = "paid" | "due" | "none";

export interface PaymentSummary {
  state: PaymentState;
  /** Total actually collected, in SAR. */
  paidSar: number;
  /** Invoices still waiting to be settled. */
  openCount: number;
  /** Most recent settlement, ISO. */
  lastPaidAt: string | null;
}

/**
 * Reduce a student's invoices to the one fact the list needs: did they pay.
 *
 * REFUNDED and CANCELLED deliberately do not count as paid — a refunded
 * student is not a paying student, and showing them as one is how a revenue
 * list starts lying. They fall into "due" if nothing else settled, which is
 * the correct place to chase them from.
 */
function summarisePayment(
  invoices: { invoiceStatus: string; totalSar: unknown; paidAt: Date | null }[]
): PaymentSummary {
  if (invoices.length === 0) {
    return { state: "none", paidSar: 0, openCount: 0, lastPaidAt: null };
  }
  const settled = invoices.filter((i) => i.invoiceStatus === "PAID");
  const paidSar = settled.reduce((sum, i) => sum + Number(i.totalSar), 0);
  const openCount = invoices.filter(
    (i) => i.invoiceStatus === "PENDING" || i.invoiceStatus === "OVERDUE"
  ).length;
  const lastPaid = settled
    .map((i) => i.paidAt)
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return {
    state: settled.length > 0 ? "paid" : "due",
    paidSar: +paidSar.toFixed(2),
    openCount,
    lastPaidAt: lastPaid?.toISOString() ?? null,
  };
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; gender?: string; package?: string; school?: string; grade?: string; age?: string; pay?: string; page?: string; sort?: string; dir?: string }>;
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
  const payStates = (sp.pay ?? "").split(",").filter(Boolean);
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

  // Who has actually paid. The answer lives in the invoices, not in
  // activePackage: that field is stamped when an account is provisioned, so a
  // manually-added or comped student carries a package they never paid for.
  // A PAID invoice is the only record that money moved.
  //
  //   paid — at least one invoice settled
  //   due  — invoiced, nothing settled yet (this is the follow-up list)
  //   none — never invoiced: staff, test and trial accounts, and students an
  //          admin created by hand. Truthfully "no invoice", not "unpaid".
  //
  // AND, not OR: `profileWhere.OR` is already spoken for by the age ranges,
  // and overwriting it would silently drop that filter.
  const PAY_CLAUSE: Record<string, unknown> = {
    paid: { invoices: { some: { invoiceStatus: "PAID" } } },
    due: {
      AND: [
        { invoices: { some: {} } },
        { invoices: { none: { invoiceStatus: "PAID" } } },
      ],
    },
    none: { invoices: { none: {} } },
  };
  const payOr = payStates.map((s) => PAY_CLAUSE[s]).filter(Boolean);
  if (payOr.length) profileWhere.AND = [{ OR: payOr }];

  if (Object.keys(profileWhere).length) where.studentProfile = { is: profileWhere };

  const sortField = sp.sort ?? "createdAt";
  const sortDir = (sp.dir ?? "desc") === "asc" ? "asc" : "desc";

  let total = 0;
  let data: any[] = [];
  let schools: any[] = [];
  let gradeOptions: string[] = [];
  let classes: any[] = [];

  try {
    const [_total, rows, _schools, _grades, _classes] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          studentProfile: {
            include: {
              school: { select: { nameEn: true, nameAr: true } },
              // Most-recent subscription carrying a promo code (D3 — promo column).
              subscriptions: {
                where: { promoCodeId: { not: null } },
                select: { promoCode: { select: { code: true } } },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
              // Drives the payment column and the "paid / due / no invoice"
              // filter. One page is 20 students, so pulling their invoice
              // rows costs little and keeps the state honest per student.
              invoices: {
                select: { invoiceStatus: true, totalSar: true, paidAt: true },
                orderBy: { issuedAt: "desc" },
              },
            },
          },
        },
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
      prisma.class.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true, name: true, cohortCode: true,
          teacher: { select: { user: { select: { name: true } } } },
        },
        orderBy: { name: "asc" },
        take: 300,
      }),
    ]);
    total = _total;
    schools = _schools;
    gradeOptions = _grades.map((g) => g.gradeLevel).filter((g): g is string => !!g);
    classes = _classes.map((c: any) => ({
      id: c.id,
      label:
        [c.name, c.teacher?.user?.name].filter(Boolean).join(" · ") +
        (c.cohortCode ? ` (${c.cohortCode})` : ""),
    }));
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
            promoCode: u.studentProfile.subscriptions[0]?.promoCode?.code ?? null,
            profileId: u.studentProfile.id,
          }
        : null,
      payment: summarisePayment(u.studentProfile?.invoices ?? []),
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
      classes={classes}
    />
  );
}
