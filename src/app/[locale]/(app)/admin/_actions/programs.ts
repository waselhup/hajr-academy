"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { openProgramForApplications } from "@/lib/openings/service";

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

const createSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(40)
    .transform((s) => s.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_")),
  nameEn: z.string().min(2),
  nameAr: z.string().min(2),
  descriptionEn: z.string().min(2),
  descriptionAr: z.string().min(2),
  type: z.enum(["GROUP", "PRIVATE", "B2B", "SELF_STUDY"]),
  defaultPriceSar: z.coerce.number().nonnegative(),
  durationHours: z.coerce.number().int().positive().nullable().optional(),
});

export async function createProgramAction(
  input: z.infer<typeof createSchema>
): Promise<Result<{ id: string }>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "VALIDATION: " + parsed.error.issues.map((i) => i.message).join(", ") };

  const exists = await prisma.program.findUnique({ where: { code: parsed.data.code } });
  if (exists) return { ok: false, error: "CODE_EXISTS" };

  try {
    const program = await prisma.program.create({
      data: {
        code: parsed.data.code,
        nameEn: parsed.data.nameEn,
        nameAr: parsed.data.nameAr,
        descriptionEn: parsed.data.descriptionEn,
        descriptionAr: parsed.data.descriptionAr,
        type: parsed.data.type,
        defaultPriceSar: parsed.data.defaultPriceSar,
        durationHours: parsed.data.durationHours ?? null,
        active: true,
      },
    });
    await logAudit({
      userId: session.user.id,
      action: "PROGRAM_CREATED",
      entity: "Program",
      entityId: program.id,
      metadata: { code: program.code, type: parsed.data.type },
      ipAddress: await ip(),
    });
    // Additive: open the new program to teach (notifies active teachers). The
    // service already swallows its own errors; this try/catch is defense-in-depth
    // so it can NEVER throw out of createProgramAction.
    try {
      await openProgramForApplications({ programId: program.id, openedByUserId: session.user.id });
    } catch (e) {
      console.error("[createProgramAction] openProgramForApplications failed (non-fatal):", e);
    }
    revalidatePath("/admin/programs");
    revalidatePath("/admin/openings");
    return { ok: true, data: { id: program.id } };
  } catch (e: any) {
    return { ok: false, error: e?.code === "P2002" ? "CODE_EXISTS" : e?.message ?? "DB_ERROR" };
  }
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
