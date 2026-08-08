"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0] ?? null;
}

const payoutSchema = z.object({
  partnerSchoolId: z.string().min(1),
  amountSar: z.coerce.number().positive().max(1_000_000),
  method: z.enum(["BANK_TRANSFER", "CASH", "OTHER"]),
  reference: z.string().max(120).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  /** yyyy-mm-dd from the date field; blank means today. */
  paidAt: z.string().optional().nullable(),
});

/**
 * Record a commission payment made to a partner.
 *
 * Deliberately NOT clamped to the outstanding balance: real payments run
 * ahead or behind, and silently refusing one would push the owner back to
 * tracking it outside the system. The UI shows the resulting balance, and
 * an overpayment simply reads as negative rather than being hidden.
 */
export async function recordPartnerPayoutAction(
  input: z.infer<typeof payoutSchema>
): Promise<Result<{ id: string }>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = payoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION: " + parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const d = parsed.data;

  const partner = await prisma.partnerSchool.findUnique({
    where: { id: d.partnerSchoolId },
    select: { id: true, nameAr: true },
  });
  if (!partner) return { ok: false, error: "NOT_FOUND" };

  // A typed date is a plain calendar day; anchor it to midday so a timezone
  // shift can never move it onto the day before.
  const paidAt = d.paidAt ? new Date(`${d.paidAt}T12:00:00`) : new Date();
  if (Number.isNaN(paidAt.getTime())) {
    return { ok: false, error: "INVALID_DATE" };
  }

  const created = await prisma.partnerPayout.create({
    data: {
      partnerSchoolId: partner.id,
      amountSar: d.amountSar as any,
      method: d.method,
      reference: d.reference?.trim() || null,
      note: d.note?.trim() || null,
      paidAt,
      createdBy: session.user.id,
    },
    select: { id: true },
  });

  await logAudit({
    userId: session.user.id,
    action: "PARTNER_PAYOUT_RECORDED",
    entity: "PartnerPayout",
    entityId: created.id,
    metadata: {
      partnerSchoolId: partner.id,
      amountSar: d.amountSar,
      method: d.method,
      reference: d.reference ?? null,
    },
    ipAddress: await ip(),
  });

  revalidatePath("/admin/schools");
  revalidatePath(`/admin/schools/${partner.id}`);
  return { ok: true, data: { id: created.id } };
}

/** Remove a payout entered by mistake. Audited with its full value. */
export async function deletePartnerPayoutAction(id: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const row = await prisma.partnerPayout.findUnique({
    where: { id },
    select: { id: true, partnerSchoolId: true, amountSar: true, paidAt: true, reference: true },
  });
  if (!row) return { ok: false, error: "NOT_FOUND" };

  await prisma.partnerPayout.delete({ where: { id } });

  await logAudit({
    userId: session.user.id,
    action: "PARTNER_PAYOUT_DELETED",
    entity: "PartnerPayout",
    entityId: id,
    // The row is gone — the audit entry is the only remaining record of it.
    metadata: {
      partnerSchoolId: row.partnerSchoolId,
      amountSar: Number(row.amountSar),
      paidAt: row.paidAt.toISOString(),
      reference: row.reference,
    },
    ipAddress: await ip(),
  });

  revalidatePath("/admin/schools");
  revalidatePath(`/admin/schools/${row.partnerSchoolId}`);
  return { ok: true, data: null };
}
