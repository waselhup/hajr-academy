"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { normalizeSaudiPhone } from "@/lib/utils";

const SPEC_VALUES = ["STEP", "IELTS", "UNIVERSITY_PREP", "GENERAL", "BUSINESS"] as const;
const DAY_VALUES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

const createSchema = z.object({
  name: z.string().min(2),
  nameAr: z.string().optional().nullable(),
  email: z.string().email(),
  phone: z.string().min(8),
  bio: z.string().optional().nullable(),
  specializations: z.array(z.enum(SPEC_VALUES)).default([]),
  salaryBase: z.number().nonnegative().default(0),
  hourlyRate: z.number().nonnegative().default(0),
  zoomHostEmail: z.string().email().optional().nullable(),
  ageGroup: z.string().optional().nullable(),
  availabilityDays: z.array(z.enum(DAY_VALUES)).default([]),
  availabilityHours: z.string().optional().nullable(),
});

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0] ?? null;
}

export async function createTeacherAction(input: z.infer<typeof createSchema>): Promise<Result<{ id: string }>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const phone = normalizeSaudiPhone(parsed.data.phone);
  if (!phone) return { ok: false, error: "INVALID_PHONE" };
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (exists) return { ok: false, error: "EMAIL_EXISTS" };
  const passwordHash = await bcrypt.hash("Hajr@2026", 10);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      name: parsed.data.name,
      nameAr: parsed.data.nameAr ?? null,
      phone,
      role: "TEACHER",
      emailVerified: false,
      teacherProfile: {
        create: {
          bio: parsed.data.bio ?? null,
          specializations: parsed.data.specializations,
          salaryBase: parsed.data.salaryBase,
          hourlyRate: parsed.data.hourlyRate,
          zoomHostEmail: parsed.data.zoomHostEmail ?? null,
          ageGroup: parsed.data.ageGroup ?? null,
          availabilityDays: parsed.data.availabilityDays,
          availabilityHours: parsed.data.availabilityHours ?? null,
        },
      },
    },
  });
  await logAudit({ userId: session.user.id, action: "TEACHER_CREATED", entity: "User", entityId: user.id, ipAddress: await ip() });
  revalidatePath("/admin/teachers");
  return { ok: true, data: { id: user.id } };
}

const updateSchema = createSchema.partial().extend({ id: z.string() });

export async function updateTeacherAction(input: z.infer<typeof updateSchema>): Promise<Result> {
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
  if (patch.bio !== undefined) profilePatch.bio = patch.bio;
  if (patch.specializations) profilePatch.specializations = patch.specializations;
  if (patch.salaryBase !== undefined) profilePatch.salaryBase = patch.salaryBase;
  if (patch.hourlyRate !== undefined) profilePatch.hourlyRate = patch.hourlyRate;
  if (patch.zoomHostEmail !== undefined) profilePatch.zoomHostEmail = patch.zoomHostEmail;
  if (patch.ageGroup !== undefined) profilePatch.ageGroup = patch.ageGroup;
  if (patch.availabilityDays !== undefined) profilePatch.availabilityDays = patch.availabilityDays;
  if (patch.availabilityHours !== undefined) profilePatch.availabilityHours = patch.availabilityHours;

  await prisma.user.update({ where: { id }, data: { ...userPatch, teacherProfile: { update: profilePatch } } });
  await logAudit({ userId: session.user.id, action: "TEACHER_UPDATED", entity: "User", entityId: id, metadata: patch as any, ipAddress: await ip() });
  revalidatePath("/admin/teachers");
  return { ok: true, data: null };
}

export async function toggleTeacherActiveAction(id: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const u = await prisma.user.findUnique({ where: { id }, select: { isActive: true, teacherProfile: { select: { active: true } } } });
  if (!u) return { ok: false, error: "NOT_FOUND" };
  await prisma.user.update({
    where: { id },
    data: { isActive: !u.isActive, teacherProfile: { update: { active: !u.isActive } } },
  });
  await logAudit({ userId: session.user.id, action: "TEACHER_TOGGLED_ACTIVE", entity: "User", entityId: id, metadata: { newState: !u.isActive }, ipAddress: await ip() });
  revalidatePath("/admin/teachers");
  return { ok: true, data: null };
}

export async function deleteTeacherAction(id: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const classCount = await prisma.class.count({ where: { teacher: { userId: id }, status: "ACTIVE" } });
  if (classCount > 0) return { ok: false, error: "HAS_ACTIVE_CLASSES" };
  await prisma.user.update({
    where: { id },
    data: { isActive: false, email: `deleted_${Date.now()}_${id}@hajracademy.com`, teacherProfile: { update: { active: false } } },
  });
  await logAudit({ userId: session.user.id, action: "TEACHER_DELETED", entity: "User", entityId: id, ipAddress: await ip() });
  revalidatePath("/admin/teachers");
  return { ok: true, data: null };
}
