"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { normalizeSaudiPhone } from "@/lib/utils";

const PackageEnum = z.enum(["ESSENTIAL", "INTEGRATED", "PRIVATE", "SCHOOL"]);
const LevelEnum = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
const GenderEnum = z.enum(["MALE", "FEMALE"]);

// birthDate (when present) must be a parseable date strictly in the past — a
// future DOB would yield a negative/nonsensical age in the Age column (#6).
const PastBirthDate = z
  .string()
  .optional()
  .nullable()
  .refine(
    (d) => !d || (!Number.isNaN(Date.parse(d)) && new Date(d) < new Date()),
    { message: "Birth date must be a valid past date" }
  );

const createSchema = z.object({
  name: z.string().min(2),
  nameAr: z.string().optional().nullable(),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(8).default("Hajr@2026"),
  birthDate: PastBirthDate,
  gradeLevel: z.string().optional().nullable(),
  englishLevel: LevelEnum.default("BEGINNER"),
  gender: GenderEnum.default("MALE"),
  schoolId: z.string().optional().nullable(),
  learningGoals: z.string().optional().nullable(),
  activePackage: PackageEnum.optional().nullable(),
  packageStartedAt: z.string().optional().nullable(),
  packageExpiresAt: z.string().optional().nullable(),
  subscriptionDate: z.string().optional().nullable(),
  importantNotes: z.string().optional().nullable(),
  studentPhone: z.string().optional().nullable(),
  guardianName: z.string().optional().nullable(),
  guardianPhone: z.string().optional().nullable(),
  residenceAddress: z.string().optional().nullable(),
  englishTeacherName: z.string().optional().nullable(),
});

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

async function ipFromHeaders() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? null;
}

export async function createStudentAction(input: z.infer<typeof createSchema>): Promise<Result<{ id: string }>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION: " + parsed.error.issues.map((i) => i.message).join(", ") };

  const phone = normalizeSaudiPhone(parsed.data.phone);
  if (!phone) return { ok: false, error: "INVALID_PHONE" };

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (exists) return { ok: false, error: "EMAIL_EXISTS" };

  const passwordHash = await bcrypt.hash(parsed.data.password ?? "Hajr@2026", 10);

  try {
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        name: parsed.data.name,
        nameAr: parsed.data.nameAr ?? null,
        phone,
        role: "STUDENT",
        emailVerified: false,
        studentProfile: {
          create: {
            birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null,
            gradeLevel: parsed.data.gradeLevel ?? null,
            englishLevel: parsed.data.englishLevel,
            gender: parsed.data.gender,
            schoolId: parsed.data.schoolId ?? null,
            learningGoals: parsed.data.learningGoals ?? null,
            activePackage: parsed.data.activePackage ?? null,
            packageStartedAt: parsed.data.packageStartedAt ? new Date(parsed.data.packageStartedAt) : null,
            packageExpiresAt: parsed.data.packageExpiresAt ? new Date(parsed.data.packageExpiresAt) : null,
            subscriptionDate: parsed.data.subscriptionDate ? new Date(parsed.data.subscriptionDate) : null,
            importantNotes: parsed.data.importantNotes ?? null,
            studentPhone: parsed.data.studentPhone ?? null,
            guardianName: parsed.data.guardianName ?? null,
            guardianPhone: parsed.data.guardianPhone ?? null,
            residenceAddress: parsed.data.residenceAddress ?? null,
            englishTeacherName: parsed.data.englishTeacherName ?? null,
          },
        },
      },
    });
    await logAudit({
      userId: session.user.id,
      action: "STUDENT_CREATED",
      entity: "User",
      entityId: user.id,
      metadata: { email: user.email },
      ipAddress: await ipFromHeaders(),
    });
    revalidatePath("/admin/students");
    return { ok: true, data: { id: user.id } };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "DB_ERROR" };
  }
}

const updateSchema = createSchema.partial().extend({ id: z.string() });

export async function updateStudentAction(input: z.infer<typeof updateSchema>): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };

  const { id, ...patch } = parsed.data;
  const userPatch: any = {};
  if (patch.name) userPatch.name = patch.name;
  if (patch.nameAr !== undefined) userPatch.nameAr = patch.nameAr;
  if (patch.phone) {
    const p = normalizeSaudiPhone(patch.phone);
    if (!p) return { ok: false, error: "INVALID_PHONE" };
    userPatch.phone = p;
  }

  const profilePatch: any = {};
  if (patch.birthDate !== undefined) profilePatch.birthDate = patch.birthDate ? new Date(patch.birthDate) : null;
  if (patch.gradeLevel !== undefined) profilePatch.gradeLevel = patch.gradeLevel;
  if (patch.englishLevel) profilePatch.englishLevel = patch.englishLevel;
  if (patch.gender) profilePatch.gender = patch.gender;
  if (patch.schoolId !== undefined) profilePatch.schoolId = patch.schoolId;
  if (patch.learningGoals !== undefined) profilePatch.learningGoals = patch.learningGoals;
  if (patch.activePackage !== undefined) profilePatch.activePackage = patch.activePackage;
  if (patch.packageStartedAt !== undefined) profilePatch.packageStartedAt = patch.packageStartedAt ? new Date(patch.packageStartedAt) : null;
  if (patch.packageExpiresAt !== undefined) profilePatch.packageExpiresAt = patch.packageExpiresAt ? new Date(patch.packageExpiresAt) : null;
  if (patch.subscriptionDate !== undefined) profilePatch.subscriptionDate = patch.subscriptionDate ? new Date(patch.subscriptionDate) : null;
  if (patch.importantNotes !== undefined) profilePatch.importantNotes = patch.importantNotes ?? null;
  if (patch.studentPhone !== undefined) profilePatch.studentPhone = patch.studentPhone ?? null;
  if (patch.guardianName !== undefined) profilePatch.guardianName = patch.guardianName ?? null;
  if (patch.guardianPhone !== undefined) profilePatch.guardianPhone = patch.guardianPhone ?? null;
  if (patch.residenceAddress !== undefined) profilePatch.residenceAddress = patch.residenceAddress ?? null;
  if (patch.englishTeacherName !== undefined) profilePatch.englishTeacherName = patch.englishTeacherName ?? null;

  try {
    await prisma.user.update({
      where: { id },
      data: { ...userPatch, studentProfile: { update: profilePatch } },
    });
    await logAudit({
      userId: session.user.id,
      action: "STUDENT_UPDATED",
      entity: "User",
      entityId: id,
      metadata: patch as any,
      ipAddress: await ipFromHeaders(),
    });
    revalidatePath("/admin/students");
    return { ok: true, data: null };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "DB_ERROR" };
  }
}

export async function getStudentPreviewAction(studentProfileId: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        user: { select: { name: true, nameAr: true, email: true, phone: true } },
        school: { select: { nameEn: true, nameAr: true } },
        // Most-recent subscription carrying a promo code (D4 — show on preview).
        subscriptions: {
          where: { promoCodeId: { not: null } },
          select: { promoCode: { select: { code: true } } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        invoices: {
          select: {
            invoiceNumber: true,
            month: true,
            year: true,
            totalSar: true,
            status: true,
            invoiceStatus: true,
            issuedAt: true,
            dueDate: true,
            paidAt: true,
          },
          orderBy: { issuedAt: "desc" },
          take: 24,
        },
        // Teacher evaluations (batch 4C, F3) — admin sees each teacher's
        // assessment + the trend over time.
        evaluations: {
          include: {
            teacher: { include: { user: { select: { name: true, nameAr: true } } } },
            class: { select: { name: true, nameAr: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });
    if (!profile) return { ok: false, error: "NOT_FOUND" };

    await logAudit({
      userId: session.user.id,
      action: "STUDENT_PREVIEWED",
      entity: "StudentProfile",
      entityId: studentProfileId,
      ipAddress: await ipFromHeaders(),
    });

    return {
      ok: true,
      data: {
        id: profile.id,
        name: profile.user?.name ?? null,
        nameAr: profile.user?.nameAr ?? null,
        email: profile.user?.email ?? null,
        phone: profile.user?.phone ?? null,
        birthDate: profile.birthDate?.toISOString() ?? null,
        gradeLevel: profile.gradeLevel,
        englishLevel: profile.englishLevel,
        gender: profile.gender,
        schoolName: profile.school?.nameEn ?? profile.schoolName ?? null,
        schoolNameAr: profile.school?.nameAr ?? null,
        learningGoals: profile.learningGoals,
        activePackage: profile.activePackage,
        packageStartedAt: profile.packageStartedAt?.toISOString() ?? null,
        packageExpiresAt: profile.packageExpiresAt?.toISOString() ?? null,
        subscriptionDate: profile.subscriptionDate?.toISOString() ?? null,
        importantNotes: profile.importantNotes,
        studentPhone: profile.studentPhone,
        guardianName: profile.guardianName,
        guardianPhone: profile.guardianPhone,
        residenceAddress: profile.residenceAddress,
        englishTeacherName: profile.englishTeacherName,
        promoCode: profile.subscriptions[0]?.promoCode?.code ?? null,
        evaluations: profile.evaluations.map((e) => ({
          id: e.id,
          skillLevel: e.skillLevel,
          participation: e.participation,
          improvement: e.improvement,
          note: e.note,
          createdAt: e.createdAt.toISOString(),
          teacherName: e.teacher.user.name,
          teacherNameAr: e.teacher.user.nameAr,
          className: e.class?.name ?? null,
          classNameAr: e.class?.nameAr ?? null,
        })),
        invoices: profile.invoices.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          month: inv.month,
          year: inv.year,
          totalSar: inv.totalSar.toString(),
          status: inv.status,
          invoiceStatus: inv.invoiceStatus,
          issuedAt: inv.issuedAt?.toISOString() ?? null,
          dueDate: inv.dueDate?.toISOString() ?? null,
          paidAt: inv.paidAt?.toISOString() ?? null,
        })),
      },
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "DB_ERROR" };
  }
}

export async function toggleStudentActiveAction(id: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const u = await prisma.user.findUnique({ where: { id }, select: { isActive: true } });
  if (!u) return { ok: false, error: "NOT_FOUND" };
  await prisma.user.update({ where: { id }, data: { isActive: !u.isActive } });
  await logAudit({
    userId: session.user.id,
    action: "STUDENT_TOGGLED_ACTIVE",
    entity: "User",
    entityId: id,
    metadata: { newState: !u.isActive },
    ipAddress: await ipFromHeaders(),
  });
  revalidatePath("/admin/students");
  return { ok: true, data: null };
}

export async function deleteStudentAction(id: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  await prisma.user.update({ where: { id }, data: { isActive: false, email: `deleted_${Date.now()}_${id}@hajracademy.com` } });
  await logAudit({
    userId: session.user.id,
    action: "STUDENT_DELETED",
    entity: "User",
    entityId: id,
    ipAddress: await ipFromHeaders(),
  });
  revalidatePath("/admin/students");
  return { ok: true, data: null };
}

const importSchema = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        phone: z.string(),
        gender: GenderEnum.optional().default("MALE"),
        englishLevel: LevelEnum.optional().default("BEGINNER"),
        gradeLevel: z.string().optional(),
      })
    )
    .max(500),
});

export async function bulkImportStudentsAction(input: z.infer<typeof importSchema>): Promise<Result<{ imported: number; failed: number; errors: string[] }>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };

  const passwordHash = await bcrypt.hash("Hajr@2026", 10);
  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of parsed.data.rows) {
    try {
      const phone = normalizeSaudiPhone(row.phone);
      if (!phone) {
        failed++;
        errors.push(`${row.email}: invalid phone`);
        continue;
      }
      await prisma.user.create({
        data: {
          email: row.email.toLowerCase(),
          passwordHash,
          name: row.name,
          phone,
          role: "STUDENT",
          studentProfile: {
            create: {
              gender: row.gender ?? "MALE",
              englishLevel: row.englishLevel ?? "BEGINNER",
              gradeLevel: row.gradeLevel ?? null,
            },
          },
        },
      });
      imported++;
    } catch (e: any) {
      failed++;
      errors.push(`${row.email}: ${e?.code === "P2002" ? "duplicate email" : e?.message}`);
    }
  }
  await logAudit({
    userId: session.user.id,
    action: "STUDENTS_BULK_IMPORTED",
    entity: "User",
    metadata: { imported, failed },
    ipAddress: await ipFromHeaders(),
  });
  revalidatePath("/admin/students");
  return { ok: true, data: { imported, failed, errors } };
}
