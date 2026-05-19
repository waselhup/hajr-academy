"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { normalizeSaudiPhone } from "@/lib/utils";

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

const schema = z.object({
  nameEn: z.string().min(2),
  nameAr: z.string().min(2),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string(),
  city: z.string(),
  contractStart: z.string(),
  contractEnd: z.string(),
  monthlyFeeSar: z.coerce.number().nonnegative(),
  studentCap: z.coerce.number().int().min(1),
  notes: z.string().optional().nullable(),
});

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0] ?? null;
}

export async function createSchoolAction(input: z.infer<typeof schema>): Promise<Result<{ id: string }>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const phone = normalizeSaudiPhone(parsed.data.contactPhone) ?? parsed.data.contactPhone;
  const created = await prisma.partnerSchool.create({
    data: {
      nameEn: parsed.data.nameEn,
      nameAr: parsed.data.nameAr,
      contactName: parsed.data.contactName,
      contactEmail: parsed.data.contactEmail.toLowerCase(),
      contactPhone: phone,
      city: parsed.data.city,
      contractStart: new Date(parsed.data.contractStart),
      contractEnd: new Date(parsed.data.contractEnd),
      monthlyFeeSar: parsed.data.monthlyFeeSar as any,
      studentCap: parsed.data.studentCap,
      notes: parsed.data.notes ?? null,
    },
  });
  await logAudit({ userId: session.user.id, action: "SCHOOL_CREATED", entity: "PartnerSchool", entityId: created.id, ipAddress: await ip() });
  revalidatePath("/admin/schools");
  return { ok: true, data: { id: created.id } };
}

const updateSchema = schema.partial().extend({ id: z.string() });

export async function updateSchoolAction(input: z.infer<typeof updateSchema>): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const { id, ...patch } = parsed.data;
  const data: any = { ...patch };
  if (patch.contractStart) data.contractStart = new Date(patch.contractStart);
  if (patch.contractEnd) data.contractEnd = new Date(patch.contractEnd);
  await prisma.partnerSchool.update({ where: { id }, data });
  await logAudit({ userId: session.user.id, action: "SCHOOL_UPDATED", entity: "PartnerSchool", entityId: id, metadata: patch as any, ipAddress: await ip() });
  revalidatePath("/admin/schools");
  return { ok: true, data: null };
}

export async function toggleSchoolActiveAction(id: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const s = await prisma.partnerSchool.findUnique({ where: { id }, select: { active: true } });
  if (!s) return { ok: false, error: "NOT_FOUND" };
  await prisma.partnerSchool.update({ where: { id }, data: { active: !s.active } });
  await logAudit({ userId: session.user.id, action: "SCHOOL_TOGGLED_ACTIVE", entity: "PartnerSchool", entityId: id, ipAddress: await ip() });
  revalidatePath("/admin/schools");
  return { ok: true, data: null };
}
