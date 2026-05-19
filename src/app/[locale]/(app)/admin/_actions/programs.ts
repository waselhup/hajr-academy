"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

const updateSchema = z.object({
  id: z.string(),
  nameEn: z.string().min(2),
  nameAr: z.string().min(2),
  descriptionEn: z.string().min(2),
  descriptionAr: z.string().min(2),
  defaultPriceSar: z.coerce.number().nonnegative(),
  durationHours: z.coerce.number().int().positive().nullable().optional(),
  active: z.boolean().optional(),
});

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0] ?? null;
}

export async function updateProgramAction(input: z.infer<typeof updateSchema>): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const { id, ...patch } = parsed.data;
  await prisma.program.update({ where: { id }, data: patch as any });
  await logAudit({ userId: session.user.id, action: "PROGRAM_UPDATED", entity: "Program", entityId: id, metadata: patch as any, ipAddress: await ip() });
  revalidatePath("/admin/programs");
  return { ok: true, data: null };
}

export async function toggleProgramActiveAction(id: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const p = await prisma.program.findUnique({ where: { id }, select: { active: true } });
  if (!p) return { ok: false, error: "NOT_FOUND" };
  await prisma.program.update({ where: { id }, data: { active: !p.active } });
  await logAudit({ userId: session.user.id, action: "PROGRAM_TOGGLED_ACTIVE", entity: "Program", entityId: id, metadata: { newState: !p.active }, ipAddress: await ip() });
  revalidatePath("/admin/programs");
  return { ok: true, data: null };
}
