import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { MyStudentsClient, type StudentCard } from "./my-students-client";

export const dynamic = "force-dynamic";

export default async function TeacherStudentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations();

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {t("Common.noData")}
        </CardContent>
      </Card>
    );
  }

  // Distinct students enrolled in any of this teacher's classes.
  const enrollments = await prisma.enrollment.findMany({
    where: {
      status: "ACTIVE",
      class: { teacherId: profile.id },
    },
    include: {
      class: { select: { id: true, name: true, nameAr: true, cohortCode: true } },
      student: {
        include: {
          user: { select: { name: true, nameAr: true, avatar: true, email: true, phone: true } },
          school: { select: { nameAr: true, nameEn: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  // De-duplicate by studentId (a student in two of the teacher's classes
  // appears once — using their first class for the card snapshot).
  const seen = new Set<string>();
  const cards: StudentCard[] = [];
  for (const e of enrollments) {
    if (seen.has(e.studentId)) continue;
    seen.add(e.studentId);
    cards.push({
      id: e.student.id,
      name: e.student.user.name,
      nameAr: e.student.user.nameAr ?? null,
      avatar: e.student.user.avatar ?? null,
      gradeLevel: e.student.gradeLevel ?? null,
      schoolName:
        locale === "ar"
          ? e.student.school?.nameAr ?? e.student.schoolName ?? null
          : e.student.school?.nameEn ?? e.student.schoolName ?? null,
      activePackage: e.student.activePackage ?? null,
      className: locale === "ar" ? e.class.nameAr ?? e.class.name : e.class.name,
      cohortCode: e.class.cohortCode,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("TeacherStudents.pageTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("TeacherStudents.pageSubtitle")}
        </p>
      </div>

      <MyStudentsClient locale={locale} students={cards} />
    </div>
  );
}
