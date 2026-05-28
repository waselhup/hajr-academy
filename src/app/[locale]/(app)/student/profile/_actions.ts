"use server";

/**
 * Server actions for /student/profile.
 *
 * - updateProfileAction: edit display name + phone (normalised).
 * - changePasswordAction: verify current password, then bcrypt-hash new.
 *
 * Email, birthDate and gender are intentionally NOT editable here — the
 * admin owns those fields. Audit rows record every mutation so super-admin
 * can see who changed what when.
 */

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { normalizeSaudiPhone } from "@/lib/utils";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
});

export async function updateProfileAction(
  input: z.infer<typeof updateProfileSchema>
): Promise<Result> {
  const session = await requireRole("STUDENT");
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };

  const phone = normalizeSaudiPhone(parsed.data.phone);
  if (!phone) return { ok: false, error: "INVALID_PHONE" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name, phone },
  });

  await audit.mutation(
    session.user.id,
    "USER_PROFILE_UPDATED",
    "User",
    session.user.id,
    { name: parsed.data.name, phone }
  );

  revalidatePath("/[locale]/student/profile", "page");
  revalidatePath("/[locale]/student", "page");
  return { ok: true };
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8).max(128),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "SAME_PASSWORD",
    path: ["newPassword"],
  });

export async function changePasswordAction(
  input: z.infer<typeof changePasswordSchema>
): Promise<Result> {
  const session = await requireRole("STUDENT");
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    const code =
      parsed.error.issues[0]?.message === "SAME_PASSWORD"
        ? "SAME_PASSWORD"
        : "VALIDATION";
    return { ok: false, error: code };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return { ok: false, error: "NOT_FOUND" };

  const valid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!valid) return { ok: false, error: "WRONG_PASSWORD" };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  await audit.mutation(
    session.user.id,
    "USER_PASSWORD_CHANGED",
    "User",
    session.user.id,
    { source: "/student/profile" }
  );

  return { ok: true };
}
