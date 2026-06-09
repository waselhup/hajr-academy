import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeacherRequestRow } from "./_components/teacher-request-row";

export const dynamic = "force-dynamic";

/**
 * Owner batch 5 — #9 admin inbox. Lists student "request a specific teacher"
 * records (created from the student "available teachers" discovery panel) so an
 * admin can follow up. This is the actionUrl target the request notification
 * points at. No student/teacher PII beyond names is surfaced.
 */
export default async function AdminTeacherRequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const isAr = locale === "ar";
  const t = await getTranslations("TeacherRequests");

  let rows: Array<{
    id: string;
    status: string;
    message: string | null;
    createdAt: Date;
    studentName: string;
    teacherName: string;
    programName: string | null;
  }> = [];

  try {
    const data = await prisma.teacherRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        student: { include: { user: { select: { name: true, nameAr: true } } } },
        teacher: { include: { user: { select: { name: true, nameAr: true } } } },
        program: { select: { nameEn: true, nameAr: true } },
      },
    });
    rows = data.map((r) => ({
      id: r.id,
      status: r.status,
      message: r.message,
      createdAt: r.createdAt,
      studentName: isAr ? r.student.user.nameAr || r.student.user.name : r.student.user.name,
      teacherName: isAr ? r.teacher.user.nameAr || r.teacher.user.name : r.teacher.user.name,
      programName: r.program ? (isAr ? r.program.nameAr : r.program.nameEn) : null,
    }));
  } catch (e) {
    console.error("[admin/teacher-requests]", e);
  }

  const pending = rows.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-hajr-deep-navy">{t("title")}</h1>
          <p className="text-sm text-hajr-gray-500">{t("subtitle")}</p>
        </div>
        {pending > 0 && (
          <Badge variant="rose" className="num">
            {pending} {t("pendingBadge")}
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-hajr-gray-50 text-xs uppercase text-hajr-gray-500">
                <tr>
                  <th className="px-3 py-2 text-start">{t("colStudent")}</th>
                  <th className="px-3 py-2 text-start">{t("colTeacher")}</th>
                  <th className="px-3 py-2 text-start">{t("colProgram")}</th>
                  <th className="px-3 py-2 text-start">{t("colMessage")}</th>
                  <th className="px-3 py-2 text-start">{t("colDate")}</th>
                  <th className="px-3 py-2 text-start">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-hajr-gray-500">
                      {t("empty")}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <TeacherRequestRow key={r.id} row={r} locale={locale} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
