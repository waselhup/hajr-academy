import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  parentOwnsChild,
  getChildSkillLevels,
  getChildGrades,
  getChildSchedule,
  getChildAttendanceCalendar,
} from "@/lib/parent/children";
import { ChildDetailClient } from "./child-detail-client";

export const dynamic = "force-dynamic";

/**
 * /parent/[childId] — child detail with 6 tabs: progress, attendance,
 * schedule, grades, invoices, communication. Access gated to the parent.
 */
export default async function ParentChildPage({
  params,
}: {
  params: Promise<{ locale: string; childId: string }>;
}) {
  const { locale, childId } = await params;
  const session = await requireRole("PARENT");
  const t = await getTranslations("ParentPortal");

  if (!(await parentOwnsChild(session.user.id, childId))) {
    redirect(`/${locale}/parent`);
  }

  const now = new Date();
  const [student, skills, grades, schedule, attendance, invoices] =
    await Promise.all([
      prisma.studentProfile.findUnique({
        where: { id: childId },
        select: {
          gradeLevel: true,
          user: { select: { name: true, nameAr: true } },
        },
      }),
      getChildSkillLevels(childId),
      getChildGrades(childId),
      getChildSchedule(childId),
      getChildAttendanceCalendar(childId, now.getFullYear(), now.getMonth() + 1),
      prisma.invoice.findMany({
        where: { studentId: childId },
        orderBy: { issuedAt: "desc" },
        take: 30,
      }),
    ]);

  const childName = student
    ? locale === "ar"
      ? student.user.nameAr ?? student.user.name
      : student.user.name
    : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{childName}</h1>
        {student?.gradeLevel && (
          <p className="text-sm text-muted-foreground">{student.gradeLevel}</p>
        )}
      </div>

      <ChildDetailClient
        childId={childId}
        skills={skills}
        grades={grades}
        schedule={schedule}
        attendance={attendance}
        invoices={invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          status: inv.invoiceStatus,
          totalAmount: Number(inv.totalSar),
          issuedAt: inv.issuedAt.toISOString(),
          dueDate: inv.dueDate.toISOString(),
        }))}
      />
    </div>
  );
}
