"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { normalizeSaudiPhone } from "@/lib/utils";
import { ensurePartnerPromoCode } from "@/lib/finance/partner-referrals";

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

const schema = z.object({
  nameEn: z.string().min(2),
  nameAr: z.string().min(2),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string(),
  city: z.string(),
  partnerType: z.enum(["CHARITY", "SCHOOL", "INDIVIDUAL"]).optional().nullable(),
  contractStart: z.string(),
  contractEnd: z.string(),
  /// The partner's cut of a referred student's first purchase.
  commissionPercent: z.coerce.number().min(0).max(100),
  /// What their code takes off for the student. Drives the PromoCode value.
  discountPercent: z.coerce.number().min(0).max(100),
  /// Keep discounting the same student on later purchases (charity case).
  discountRecurs: z.boolean().optional(),
  studentCap: z.coerce.number().int().min(1),
  notes: z.string().optional().nullable(),
});

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0] ?? null;
}

export async function createSchoolAction(input: z.infer<typeof schema>): Promise<Result<{ id: string; promoCode: string | null }>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const phone = normalizeSaudiPhone(parsed.data.contactPhone) ?? parsed.data.contactPhone;
  const contractEnd = new Date(parsed.data.contractEnd);
  const created = await prisma.partnerSchool.create({
    data: {
      nameEn: parsed.data.nameEn,
      nameAr: parsed.data.nameAr,
      contactName: parsed.data.contactName,
      contactEmail: parsed.data.contactEmail.toLowerCase(),
      contactPhone: phone,
      city: parsed.data.city,
      partnerType: parsed.data.partnerType ?? "SCHOOL",
      contractStart: new Date(parsed.data.contractStart),
      contractEnd,
      // Retainers are retired — partners earn a share of what they bring in.
      monthlyFeeSar: 0 as any,
      commissionPercent: parsed.data.commissionPercent as any,
      discountRecurs: parsed.data.discountRecurs ?? true,
      studentCap: parsed.data.studentCap,
      notes: parsed.data.notes ?? null,
    },
  });

  // The code is the whole mechanism: without it a partner cannot refer anyone.
  const promo = await ensurePartnerPromoCode({
    partnerSchoolId: created.id,
    nameEn: parsed.data.nameEn,
    nameAr: parsed.data.nameAr,
    discountPercent: parsed.data.discountPercent,
    discountRecurs: parsed.data.discountRecurs ?? true,
    expiresAt: contractEnd,
    createdBy: session.user.id,
  });

  await logAudit({ userId: session.user.id, action: "SCHOOL_CREATED", entity: "PartnerSchool", entityId: created.id, metadata: { promoCode: promo.code, commissionPercent: parsed.data.commissionPercent }, ipAddress: await ip() });
  revalidatePath("/admin/schools");
  return { ok: true, data: { id: created.id, promoCode: promo.code } };
}

const updateSchema = schema.partial().extend({ id: z.string() });

export async function updateSchoolAction(input: z.infer<typeof updateSchema>): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const { id, discountPercent, ...patch } = parsed.data;
  const data: any = { ...patch };
  if (patch.contractStart) data.contractStart = new Date(patch.contractStart);
  if (patch.contractEnd) data.contractEnd = new Date(patch.contractEnd);
  const updated = await prisma.partnerSchool.update({
    where: { id },
    data,
    select: { nameEn: true, nameAr: true, contractEnd: true, discountRecurs: true },
  });

  // Re-price the partner's code. The code STRING is never regenerated —
  // students may already be carrying it — only its percentage, expiry and
  // per-student repeat allowance.
  if (discountPercent != null) {
    await ensurePartnerPromoCode({
      partnerSchoolId: id,
      nameEn: updated.nameEn,
      nameAr: updated.nameAr,
      discountPercent,
      discountRecurs: updated.discountRecurs,
      expiresAt: updated.contractEnd,
      createdBy: session.user.id,
    });
  }

  await logAudit({ userId: session.user.id, action: "SCHOOL_UPDATED", entity: "PartnerSchool", entityId: id, metadata: { ...patch, discountPercent } as any, ipAddress: await ip() });
  revalidatePath("/admin/schools");
  return { ok: true, data: null };
}

export async function toggleSchoolActiveAction(id: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const s = await prisma.partnerSchool.findUnique({ where: { id }, select: { active: true } });
  if (!s) return { ok: false, error: "NOT_FOUND" };
  const nowActive = !s.active;
  await prisma.partnerSchool.update({ where: { id }, data: { active: nowActive } });

  // Deactivating a partner must also stop their code working — otherwise
  // students keep getting the discount from a partnership that has ended.
  await prisma.promoCode.updateMany({
    where: { partnerSchoolId: id },
    data: { isActive: nowActive },
  });

  await logAudit({ userId: session.user.id, action: "SCHOOL_TOGGLED_ACTIVE", entity: "PartnerSchool", entityId: id, metadata: { nowActive }, ipAddress: await ip() });
  revalidatePath("/admin/schools");
  return { ok: true, data: null };
}
