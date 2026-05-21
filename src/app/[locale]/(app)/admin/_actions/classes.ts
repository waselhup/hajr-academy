"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { isGenderAllowed, nextInvoiceNumber, calcInvoiceTotals } from "@/lib/invoice";
import { generateCohortCode, nextCohortLetter } from "@/lib/cohort";
import type { ProgramCode, DayOfWeek } from "@prisma/client";

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

const DayEnum = z.enum(["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]);

const createSchema = z.object({
  programId: z.string(),
  name: z.string().min(2),
  nameAr: z.string().optional().nullable(),
  cohortCode: z.string().optional().nullable(),
  teacherId: z.string(),
  scheduleDays: z.array(DayEnum).min(1),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.coerce.number().int().min(15).default(60),
  maxStudents: z.coerce.number().int().min(1).default(6),
  genderRestriction: z.enum(["MALE", "FEMALE", ""]).optional(),
  allowCrossGenderChat: z.boolean().default(false),
  pricePerMonth: z.coerce.number().nonnegative().default(0),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0] ?? null;
}

export async function createClassAction(input: z.infer<typeof createSchema>): Promise<Result<{ id: string }>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION: " + parsed.error.issues[0].message };

  const program = await prisma.program.findUnique({ where: { id: parsed.data.programId }, select: { code: true } });
  if (!program) return { ok: false, error: "INVALID_PROGRAM" };

  let cohortCode = parsed.data.cohortCode?.trim();
  if (!cohortCode) {
    const existing = await prisma.class.findMany({
      where: { program: { code: program.code }, startDate: { gte: new Date(new Date(parsed.data.startDate).getFullYear(), 0, 1) } },
      select: { cohortCode: true },
    });
    const letters = existing.map((c) => c.cohortCode.slice(-1));
    const letter = nextCohortLetter(letters);
    cohortCode = generateCohortCode({
      programCode: program.code as ProgramCode,
      year: new Date(parsed.data.startDate).getFullYear(),
      letter,
    });
  }

  const created = await prisma.class.create({
    data: {
      programId: parsed.data.programId,
      name: parsed.data.name,
      nameAr: parsed.data.nameAr ?? null,
      cohortCode,
      description: parsed.data.description ?? null,
      teacherId: parsed.data.teacherId,
      scheduleDays: parsed.data.scheduleDays as DayOfWeek[],
      timeSlot: parsed.data.timeSlot,
      durationMinutes: parsed.data.durationMinutes,
      maxStudents: parsed.data.maxStudents,
      genderRestriction: parsed.data.genderRestriction === "" ? null : (parsed.data.genderRestriction as any),
      allowCrossGenderChat: parsed.data.allowCrossGenderChat,
      pricePerMonth: parsed.data.pricePerMonth,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      status: "ACTIVE",
    },
  });
  await logAudit({ userId: session.user.id, action: "CLASS_CREATED", entity: "Class", entityId: created.id, metadata: { cohortCode }, ipAddress: await ip() });

  // Phase 7: notify the assigned teacher.
  try {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: parsed.data.teacherId },
      select: { userId: true },
    });
    if (teacher) {
      const { triggerTeacherAssigned } = await import("@/lib/comms/triggers");
      await triggerTeacherAssigned(
        teacher.userId,
        created.nameAr ?? created.name
      );
    }
  } catch (e) {
    console.error("[create-class] teacher notification failed:", e);
  }

  revalidatePath("/admin/classes");
  return { ok: true, data: { id: created.id } };
}

const updateSchema = createSchema.partial().extend({ id: z.string() });

export async function updateClassAction(input: z.infer<typeof updateSchema>): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const { id, ...patch } = parsed.data;
  const data: any = { ...patch };
  if (patch.startDate) data.startDate = new Date(patch.startDate);
  if (patch.endDate !== undefined) data.endDate = patch.endDate ? new Date(patch.endDate) : null;
  if (patch.genderRestriction === "") data.genderRestriction = null;
  await prisma.class.update({ where: { id }, data });
  await logAudit({ userId: session.user.id, action: "CLASS_UPDATED", entity: "Class", entityId: id, metadata: patch as any, ipAddress: await ip() });
  revalidatePath("/admin/classes");
  revalidatePath(`/admin/classes/${id}`);
  return { ok: true, data: null };
}

export async function deleteClassAction(id: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  await prisma.class.update({ where: { id }, data: { status: "CANCELLED" } });
  await logAudit({ userId: session.user.id, action: "CLASS_CANCELLED", entity: "Class", entityId: id, ipAddress: await ip() });
  revalidatePath("/admin/classes");
  return { ok: true, data: null };
}

export async function enrollStudentInClassAction(opts: { classId: string; studentProfileId: string }): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const [cls, student] = await Promise.all([
    prisma.class.findUnique({ where: { id: opts.classId }, select: { genderRestriction: true, maxStudents: true, _count: { select: { enrollments: true } } } }),
    prisma.studentProfile.findUnique({ where: { id: opts.studentProfileId }, select: { gender: true } }),
  ]);
  if (!cls || !student) return { ok: false, error: "NOT_FOUND" };
  if (!isGenderAllowed(student.gender, cls.genderRestriction)) return { ok: false, error: "GENDER_MISMATCH" };
  if (cls._count.enrollments >= cls.maxStudents) return { ok: false, error: "CLASS_FULL" };
  await prisma.enrollment.upsert({
    where: { studentId_classId: { studentId: opts.studentProfileId, classId: opts.classId } },
    create: { studentId: opts.studentProfileId, classId: opts.classId },
    update: { status: "ACTIVE" },
  });
  await logAudit({ userId: session.user.id, action: "ENROLLMENT_ADDED", entity: "Enrollment", metadata: opts, ipAddress: await ip() });

  // Phase 7: send the student an enrollment-confirmed notification.
  try {
    const [studentRec, classRec] = await Promise.all([
      prisma.studentProfile.findUnique({
        where: { id: opts.studentProfileId },
        select: { userId: true },
      }),
      prisma.class.findUnique({
        where: { id: opts.classId },
        select: { name: true, nameAr: true },
      }),
    ]);
    if (studentRec && classRec) {
      const { triggerEnrollmentConfirmed } = await import("@/lib/comms/triggers");
      await triggerEnrollmentConfirmed(
        studentRec.userId,
        classRec.nameAr ?? classRec.name
      );
    }
  } catch (e) {
    console.error("[enroll] confirmation notification failed:", e);
  }

  revalidatePath(`/admin/classes/${opts.classId}`);
  return { ok: true, data: null };
}

export async function unenrollStudentAction(enrollmentId: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const en = await prisma.enrollment.findUnique({ where: { id: enrollmentId }, select: { classId: true } });
  if (!en) return { ok: false, error: "NOT_FOUND" };
  await prisma.enrollment.update({ where: { id: enrollmentId }, data: { status: "DROPPED" } });
  await logAudit({ userId: session.user.id, action: "ENROLLMENT_DROPPED", entity: "Enrollment", entityId: enrollmentId, ipAddress: await ip() });
  revalidatePath(`/admin/classes/${en.classId}`);
  return { ok: true, data: null };
}

const bulkInvoiceSchema = z.object({
  classId: z.string(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2024).max(2099),
});

export async function previewBulkInvoiceAction(input: z.infer<typeof bulkInvoiceSchema>): Promise<Result<{ count: number; totalSar: number; pricePerMonth: number }>> {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = bulkInvoiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const cls = await prisma.class.findUnique({
    where: { id: parsed.data.classId },
    include: { _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } },
  });
  if (!cls) return { ok: false, error: "NOT_FOUND" };
  const price = Number(cls.pricePerMonth);
  const totals = calcInvoiceTotals(price);
  return { ok: true, data: { count: cls._count.enrollments, totalSar: totals.total * cls._count.enrollments, pricePerMonth: price } };
}

export async function bulkGenerateInvoicesAction(input: z.infer<typeof bulkInvoiceSchema>): Promise<Result<{ count: number; totalSar: number }>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = bulkInvoiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const cls = await prisma.class.findUnique({
    where: { id: parsed.data.classId },
    include: { enrollments: { where: { status: "ACTIVE" }, select: { studentId: true, student: { select: { activePackage: true } } } } },
  });
  if (!cls) return { ok: false, error: "NOT_FOUND" };
  const price = Number(cls.pricePerMonth);
  const totals = calcInvoiceTotals(price);
  const dueDate = new Date(parsed.data.year, parsed.data.month - 1, 15);

  let count = 0;
  for (const en of cls.enrollments) {
    const num = await nextInvoiceNumber(parsed.data.year);
    try {
      await prisma.invoice.create({
        data: {
          invoiceNumber: num,
          studentId: en.studentId,
          classId: cls.id,
          packageType: (en.student.activePackage ?? null) as any,
          month: parsed.data.month,
          year: parsed.data.year,
          subtotalSar: totals.subtotal as any,
          vatSar: totals.vat as any,
          totalSar: totals.total as any,
          status: "PENDING",
          dueDate,
        },
      });
      count++;
    } catch {
      // skip duplicates
    }
  }
  await logAudit({
    userId: session.user.id,
    action: "BULK_INVOICES_GENERATED",
    entity: "Class",
    entityId: cls.id,
    metadata: { classId: cls.id, month: parsed.data.month, year: parsed.data.year, count, totalSar: totals.total * count },
    ipAddress: await ip(),
  });
  revalidatePath(`/admin/classes/${cls.id}`);
  revalidatePath("/admin/finance");
  return { ok: true, data: { count, totalSar: +(totals.total * count).toFixed(2) } };
}
