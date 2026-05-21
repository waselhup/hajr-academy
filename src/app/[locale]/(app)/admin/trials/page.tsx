import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { TrialsClient } from "./_components/trials-client";

export const dynamic = "force-dynamic";

export default async function AdminTrialsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations();

  let data: any[] = [];

  try {
    const trials = await prisma.trialRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
    data = trials.map((tr) => ({
      id: tr.id,
      name: tr.name,
      phone: tr.phone,
      email: tr.email,
      childGrade: tr.childGrade,
      preferredProgram: tr.preferredProgram,
      preferredTime: tr.preferredTime,
      notes: tr.notes,
      source: tr.source,
      status: tr.status,
      assignedTo: tr.assignedTo,
      followUpAt: tr.followUpAt?.toISOString() ?? null,
      convertedToStudentId: tr.convertedToStudentId,
      createdAt: tr.createdAt.toISOString(),
      updatedAt: tr.updatedAt.toISOString(),
    }));
  } catch (e) {
    console.error("[admin-trials] DB query failed:", e);
  }

  return <TrialsClient rows={data} />;
}
