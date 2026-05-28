import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

export default async function TeacherLibraryStudentPage({
  params,
}: {
  params: Promise<{ locale: string; studentId: string }>;
}) {
  const { locale, studentId } = await params;
  await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("Library");

  let student: {
    id: string;
    user: { name: string; nameAr: string | null; avatar: string | null };
  } | null = null;
  let progress: Array<{
    id: string;
    progressPct: number;
    timeSpentSec: number;
    status: string;
    lastAccessAt: Date;
    libraryItem: { title: string; titleAr: string; type: string };
  }> = [];
  let totalTime = 0;
  let completed = 0;
  try {
    const studentRow = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { name: true, nameAr: true, avatar: true } } },
    });
    if (studentRow) {
      student = {
        id: studentRow.id,
        user: studentRow.user,
      };
    }
    const progressRows = await prisma.libraryProgress.findMany({
      where: { studentId },
      orderBy: { lastAccessAt: "desc" },
      include: {
        libraryItem: {
          select: { id: true, title: true, titleAr: true, type: true, durationMinutes: true },
        },
      },
      take: 100,
    });
    progress = progressRows.map((p) => ({
      id: p.id,
      progressPct: p.progressPct,
      timeSpentSec: p.timeSpentSec,
      status: p.status,
      lastAccessAt: p.lastAccessAt,
      libraryItem: {
        title: p.libraryItem.title,
        titleAr: p.libraryItem.titleAr,
        type: p.libraryItem.type,
      },
    }));
    totalTime = progress.reduce((acc, p) => acc + p.timeSpentSec, 0);
    completed = progress.filter((p) => p.status === "COMPLETED").length;
  } catch (e) {
    console.error("[teacher/library/students]", e);
  }

  if (!student) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("studentNotFound")}</h1>
        <Button asChild variant="outline">
          <Link href={`/${locale}/teacher/students`}>{t("backToStudents")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hajr-deep-navy">
          {t("studentActivityTitle")}
        </h1>
        <p className="text-sm text-hajr-gray-500">
          {student.user.nameAr || student.user.name}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("itemsOpened")}</div>
            <div className="text-2xl font-bold">{progress.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("itemsCompleted")}</div>
            <div className="text-2xl font-bold text-hajr-mint">{completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-hajr-gray-500">{t("totalTimeSpent")}</div>
            <div className="text-2xl font-bold">{fmtTime(totalTime)}</div>
          </CardContent>
        </Card>
      </div>

      {progress.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-hajr-gray-500">
            {t("noStudentActivity")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-hajr-gray-50 text-start text-xs uppercase text-hajr-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-start">{t("itemTitle")}</th>
                    <th className="px-4 py-3 text-start">{t("type")}</th>
                    <th className="px-4 py-3 text-start">{t("progress")}</th>
                    <th className="px-4 py-3 text-start">{t("timeSpent")}</th>
                    <th className="px-4 py-3 text-start">{t("lastAccess")}</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.map((p) => (
                    <tr key={p.id} className="border-t border-hajr-gray-100">
                      <td className="px-4 py-3 font-medium">
                        {p.libraryItem.titleAr || p.libraryItem.title}
                      </td>
                      <td className="px-4 py-3 text-hajr-gray-500">{p.libraryItem.type}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            p.status === "COMPLETED"
                              ? "success"
                              : p.status === "IN_PROGRESS"
                              ? "info"
                              : "outline"
                          }
                        >
                          {p.progressPct}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-hajr-gray-500">
                        {fmtTime(p.timeSpentSec)}
                      </td>
                      <td className="px-4 py-3 text-hajr-gray-500">
                        {p.lastAccessAt.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
