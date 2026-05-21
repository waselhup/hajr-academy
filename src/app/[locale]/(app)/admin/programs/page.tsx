import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ProgramsClient } from "./_components/programs-client";

export const dynamic = "force-dynamic";

export default async function AdminProgramsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  let rows: any[] = [];

  try {
    const programs = await prisma.program.findMany({
      include: { _count: { select: { classes: true } } },
      orderBy: { nameEn: "asc" },
    });
    rows = programs.map((p) => ({
      id: p.id,
      code: p.code,
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      descriptionEn: p.descriptionEn,
      descriptionAr: p.descriptionAr,
      type: p.type,
      defaultPriceSar: p.defaultPriceSar.toString(),
      durationHours: p.durationHours,
      active: p.active,
      classesCount: p._count.classes,
    }));
  } catch (e) {
    console.error("[admin-programs] DB query failed:", e);
  }

  return <ProgramsClient rows={rows} />;
}
