"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { normalizeSaudiPhone } from "@/lib/utils";
import { generateInviteCode } from "@/lib/invite-code";

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

const createSchema = z.object({
  name: z.string().min(2),
  nameAr: z.string().optional().nullable(),
  email: z.string().email(),
  phone: z.string(),
  occupation: z.string().optional().nullable(),
});

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0] ?? null;
}

export async function createParentAction(input: z.infer<typeof createSchema>): Promise<Result<{ id: string; inviteCode: string }>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const phone = normalizeSaudiPhone(parsed.data.phone);
  if (!phone) return { ok: false, error: "INVALID_PHONE" };
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (exists) return { ok: false, error: "EMAIL_EXISTS" };

  const passwordHash = await bcrypt.hash("Hajr@2026", 10);
  const inviteCode = generateInviteCode(8);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      name: parsed.data.name,
      nameAr: parsed.data.nameAr ?? null,
      phone,
      role: "PARENT",
      parentProfile: { create: { occupation: parsed.data.occupation ?? null, inviteCode } },
    },
    include: { parentProfile: true },
  });
  await logAudit({ userId: session.user.id, action: "PARENT_CREATED", entity: "User", entityId: user.id, ipAddress: await ip() });
  revalidatePath("/admin/parents");
  return { ok: true, data: { id: user.id, inviteCode: user.parentProfile!.inviteCode } };
}

const updateSchema = createSchema.partial().extend({ id: z.string() });

export async function updateParentAction(input: z.infer<typeof updateSchema>): Promise<Result> {
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
  if (patch.occupation !== undefined) profilePatch.occupation = patch.occupation;

  await prisma.user.update({ where: { id }, data: { ...userPatch, parentProfile: { update: profilePatch } } });
  await logAudit({ userId: session.user.id, action: "PARENT_UPDATED", entity: "User", entityId: id, ipAddress: await ip() });
  revalidatePath("/admin/parents");
  return { ok: true, data: null };
}

export async function regenerateInviteCodeAction(parentProfileId: string): Promise<Result<{ code: string }>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const code = generateInviteCode(8);
  await prisma.parentProfile.update({ where: { id: parentProfileId }, data: { inviteCode: code } });
  await logAudit({ userId: session.user.id, action: "PARENT_INVITE_REGENERATED", entity: "ParentProfile", entityId: parentProfileId, ipAddress: await ip() });
  revalidatePath("/admin/parents");
  return { ok: true, data: { code } };
}

const linkSchema = z.object({
  parentProfileId: z.string(),
  studentProfileId: z.string(),
  relation: z.string().default("parent"),
  isPrimary: z.boolean().default(false),
  canPay: z.boolean().default(true),
});

export async function linkChildAction(input: z.infer<typeof linkSchema>): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  await prisma.parentStudentLink.upsert({
    where: { parentId_studentId: { parentId: parsed.data.parentProfileId, studentId: parsed.data.studentProfileId } },
    create: {
      parentId: parsed.data.parentProfileId,
      studentId: parsed.data.studentProfileId,
      relation: parsed.data.relation,
      isPrimary: parsed.data.isPrimary,
      canPay: parsed.data.canPay,
    },
    update: { relation: parsed.data.relation, isPrimary: parsed.data.isPrimary, canPay: parsed.data.canPay },
  });
  await logAudit({ userId: session.user.id, action: "PARENT_LINKED_CHILD", entity: "ParentStudentLink", metadata: parsed.data, ipAddress: await ip() });
  revalidatePath("/admin/parents");
  return { ok: true, data: null };
}

export async function unlinkChildAction(linkId: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  await prisma.parentStudentLink.delete({ where: { id: linkId } });
  await logAudit({ userId: session.user.id, action: "PARENT_UNLINKED_CHILD", entity: "ParentStudentLink", entityId: linkId, ipAddress: await ip() });
  revalidatePath("/admin/parents");
  return { ok: true, data: null };
}

export async function deleteParentAction(id: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  await prisma.user.update({
    where: { id },
    data: { isActive: false, email: `deleted_${Date.now()}_${id}@hajracademy.com` },
  });
  await logAudit({ userId: session.user.id, action: "PARENT_DELETED", entity: "User", entityId: id, ipAddress: await ip() });
  revalidatePath("/admin/parents");
  return { ok: true, data: null };
}
