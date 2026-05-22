import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { TransferStudentClient } from "./transfer-client";

export const dynamic = "force-dynamic";

/**
 * /admin/students/transfer — move a student from one class to another.
 */
export default async function AdminTransferPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Assignment");

  let students: { id: string; name: string; currentClassId: string | null; currentClassName: string | null }[] = [];
  let classes: { id: string; name: string; teacherName: string; seats: string }[] = [];

  try {
    const [studentRows, classRows] = await Promise.all([
      prisma.studentProfile.findMany({
        take: 500,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, nameAr: true } },
          enrollments: {
            where: { status: "ACTIVE" },
            include: { class: { select: { id: true, name: true, nameAr: true } } },
          },
        },
      }),
      prisma.class.findMany({
        where: { status: "ACTIVE" },
        include: {
          teacher: { include: { user: { select: { name: true, nameAr: true } } } },
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    students = studentRows.map((s) => {
      const active = s.enrollments[0]?.class ?? null;
      return {
        id: s.id,
        name: s.user.nameAr ? `${s.user.name} (${s.user.nameAr})` : s.user.name,
        currentClassId: active?.id ?? null,
        currentClassName: active
          ? active.nameAr ?? active.name
          : null,
      };
    });
    classes = classRows.map((c) => ({
      id: c.id,
      name: c.nameAr ?? c.name,
      teacherName: c.teacher.user.nameAr ?? c.teacher.user.name,
      seats: `${c._count.enrollments}/${c.maxStudents}`,
    }));
  } catch (e) {
    console.error("[admin-transfer] failed:", e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("transferStudent")}</h1>
      <TransferStudentClient students={students} classes={classes} />
    </div>
  );
}
