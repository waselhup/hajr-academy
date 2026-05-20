"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import type { TrialStatus } from "@prisma/client";

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

async function ipFromHeaders() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? null;
}

const VALID_STATUSES: TrialStatus[] = [
  "NEW",
  "CONTACTED",
  "SCHEDULED",
  "COMPLETED",
  "CONVERTED",
  "DECLINED",
];

export async function updateTrialStatus(
  id: string,
  status: TrialStatus
): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");

  if (!VALID_STATUSES.includes(status)) {
    return { ok: false, error: "INVALID_STATUS" };
  }

  const trial = await prisma.trialRequest.findUnique({ where: { id } });
  if (!trial) return { ok: false, error: "NOT_FOUND" };

  try {
    await prisma.trialRequest.update({
      where: { id },
      data: { status },
    });

    await logAudit({
      userId: session.user.id,
      action: "TRIAL_STATUS_UPDATED",
      entity: "TrialRequest",
      entityId: id,
      metadata: { previousStatus: trial.status, newStatus: status },
      ipAddress: await ipFromHeaders(),
    });

    revalidatePath("/admin/trials");
    return { ok: true, data: null };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "DB_ERROR" };
  }
}

export async function assignTrial(
  id: string,
  userId: string
): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");

  const trial = await prisma.trialRequest.findUnique({ where: { id } });
  if (!trial) return { ok: false, error: "NOT_FOUND" };

  try {
    await prisma.trialRequest.update({
      where: { id },
      data: { assignedTo: userId },
    });

    await logAudit({
      userId: session.user.id,
      action: "TRIAL_ASSIGNED",
      entity: "TrialRequest",
      entityId: id,
      metadata: { assignedTo: userId },
      ipAddress: await ipFromHeaders(),
    });

    revalidatePath("/admin/trials");
    return { ok: true, data: null };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "DB_ERROR" };
  }
}

export async function getTrialStats(): Promise<
  Result<Record<TrialStatus, number>>
> {
  await requireRole("ADMIN", "SUPER_ADMIN");

  try {
    const counts = await prisma.trialRequest.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const stats: Record<string, number> = {
      NEW: 0,
      CONTACTED: 0,
      SCHEDULED: 0,
      COMPLETED: 0,
      CONVERTED: 0,
      DECLINED: 0,
    };

    for (const row of counts) {
      stats[row.status] = row._count.status;
    }

    return { ok: true, data: stats as Record<TrialStatus, number> };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "DB_ERROR" };
  }
}
