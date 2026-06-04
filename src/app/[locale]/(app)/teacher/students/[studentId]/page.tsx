import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Phone, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const ATTENDANCE_COLORS: Record<string, string> = {
  PRESENT: "success",
  ABSENT: "danger",
  LATE: "warning",
  EXCUSED: "info",
};

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; studentId: string }>;
}) {
  const { locale, studentId } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations();

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) notFound();

  // Permission guard: must be enrolled in one of the teacher's classes.
  const teacherClassIds = (
    await prisma.class.findMany({
      where: { teacherId: profile.id },
      select: { id: true },
    })
  ).map((c) => c.id);

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId,
      classId: { in: teacherClassIds },
    },
  });
  if (!enrollment) {
    // 403 — student not in this teacher's roster.
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-destructive">
            {locale === "ar"
              ? "ليس لديك صلاحية لعرض هذا الطالب."
              : "You do not have permission to view this student."}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href={`/${locale}/teacher/students`}>{t("TeacherStudents.pageTitle")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      user: {
        select: {
          name: true,
          nameAr: true,
          email: true,
          phone: true,
          avatar: true,
        },
      },
      school: { select: { nameAr: true, nameEn: true } },
      parentLinks: {
        include: {
          parent: {
            include: { user: { select: { name: true, nameAr: true, phone: true } } },
          },
        },
      },
    },
  });
  if (!student) notFound();

  const displayName = locale === "ar" && student.user.nameAr ? student.user.nameAr : student.user.name;
  const schoolName =
    locale === "ar"
      ? student.school?.nameAr ?? student.schoolName ?? "—"
      : student.school?.nameEn ?? student.schoolName ?? "—";

  // Attendance — only for sessions in this teacher's classes.
  const attendances = await prisma.attendance.findMany({
    where: {
      studentId,
      session: { class: { teacherId: profile.id } },
    },
    include: {
      session: {
        select: {
          id: true,
          scheduledDate: true,
          status: true,
          class: { select: { name: true, nameAr: true, cohortCode: true } },
        },
      },
    },
    orderBy: { session: { scheduledDate: "desc" } },
    take: 50,
  });

  // Recent unmarked sessions where this student is enrolled.
  const unmarkedSessions = await prisma.classSession.findMany({
    where: {
      class: { teacherId: profile.id, enrollments: { some: { studentId } } },
      attendances: { none: { studentId } },
      status: { in: ["LIVE", "COMPLETED", "SCHEDULED"] },
      scheduledDate: { lte: new Date() },
    },
    select: {
      id: true,
      scheduledDate: true,
      class: { select: { name: true, nameAr: true, cohortCode: true } },
    },
    orderBy: { scheduledDate: "desc" },
    take: 10,
  });

  // Submissions for this student in the teacher's classes.
  const submissions = await prisma.submission.findMany({
    where: {
      studentId,
      assignment: { class: { teacherId: profile.id } },
    },
    include: {
      assignment: { select: { title: true, titleAr: true, dueDate: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: 30,
  });

  // Lab skill snapshot.
  const skillLevels = await prisma.skillLevel.findMany({
    where: { studentId },
    orderBy: { skill: "asc" },
  });

  const parentLink = student.parentLinks.find((l) => l.isPrimary) ?? student.parentLinks[0] ?? null;
  const parent = parentLink?.parent ?? null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/${locale}/teacher/students`}>
          <ArrowLeft className="me-2 h-4 w-4 rtl-flip" />
          {t("TeacherStudents.pageTitle")}
        </Link>
      </Button>

      {/* Profile header card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20 ring-4 ring-brand-rose/20">
              {student.user.avatar ? (
                <AvatarImage src={student.user.avatar} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-brand-navy text-xl text-white">
                {initials(student.user.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-2xl font-bold text-brand-navy">{displayName}</h1>
                <p className="text-sm text-muted-foreground">
                  {locale === "ar" && student.user.nameAr ? student.user.name : student.user.nameAr ?? ""}
                </p>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{student.user.email}</span>
                </div>
                {student.user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="num">{student.user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {t("TeacherStudents.gradeLabel")}: {student.gradeLevel ?? "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">🏫</span>
                  <span>
                    {t("TeacherStudents.schoolLabel")}: {schoolName}
                  </span>
                </div>
              </div>

              {student.activePackage && (
                <Badge variant="default" className="text-xs">
                  💎 {student.activePackage}
                </Badge>
              )}

              {parent && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs">
                  <p className="mb-1 font-semibold text-brand-navy">
                    {locale === "ar" ? "ولي الأمر" : "Parent"}
                  </p>
                  <p>
                    {locale === "ar" && parent.user.nameAr ? parent.user.nameAr : parent.user.name}
                    {parent.user.phone && (
                      <>
                        <span className="text-muted-foreground"> · </span>
                        <span className="num">{parent.user.phone}</span>
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
          <TabsTrigger value="attendance">{t("TeacherStudents.attendanceTab")}</TabsTrigger>
          <TabsTrigger value="assignments">{t("TeacherStudents.assignmentsTab")}</TabsTrigger>
          <TabsTrigger value="lab">{t("TeacherStudents.labTab")}</TabsTrigger>
        </TabsList>

        {/* Attendance tab */}
        <TabsContent value="attendance" className="space-y-4">
          {unmarkedSessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {locale === "ar" ? "جلسات بحاجة لتسجيل" : "Sessions Needing Attendance"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {unmarkedSessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {locale === "ar" ? s.class.nameAr ?? s.class.name : s.class.name}
                      </p>
                      <p className="text-xs text-muted-foreground num">
                        {s.scheduledDate.toLocaleString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US")}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/${locale}/teacher/attendance/${s.id}`}>
                        {t("TeacherStudents.markAttendance")}
                      </Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {locale === "ar" ? "سجل الحضور" : "Attendance History"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendances.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {locale === "ar" ? "لا يوجد سجل بعد." : "No history yet."}
                </p>
              ) : (
                <div className="space-y-2">
                  {attendances.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {locale === "ar" ? a.session.class.nameAr ?? a.session.class.name : a.session.class.name}
                        </p>
                        <p className="text-xs text-muted-foreground num">
                          {a.session.scheduledDate.toLocaleString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US")}
                        </p>
                      </div>
                      <Badge variant={(ATTENDANCE_COLORS[a.status] as any) ?? "secondary"}>
                        {a.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments tab */}
        <TabsContent value="assignments">
          <Card>
            <CardContent className="p-4">
              {submissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {locale === "ar" ? "لا توجد تسليمات بعد." : "No submissions yet."}
                </p>
              ) : (
                <div className="space-y-2">
                  {submissions.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {locale === "ar" ? s.assignment.titleAr ?? s.assignment.title : s.assignment.title}
                        </p>
                        <p className="text-xs text-muted-foreground num">
                          {s.submittedAt.toLocaleDateString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US")}
                        </p>
                      </div>
                      <div className="text-end">
                        {s.grade !== null && s.grade !== undefined ? (
                          <Badge variant="success" className="num">
                            {s.grade} / 100
                          </Badge>
                        ) : (
                          <Badge variant="warning">
                            {locale === "ar" ? "غير مقيّم" : "Ungraded"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lab tab */}
        <TabsContent value="lab">
          <Card>
            <CardContent className="p-4">
              {skillLevels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {locale === "ar" ? "لا توجد بيانات مختبر بعد." : "No lab data yet."}
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {skillLevels.map((sl) => (
                    <div key={sl.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{sl.skill}</span>
                        <Badge variant="info">{sl.currentLevel}</Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>
                          {locale === "ar" ? "محاولات: " : "Attempts: "}
                          <span className="num">{sl.totalAttempts}</span>
                        </span>
                        <span>
                          {locale === "ar" ? "نقاط: " : "Points: "}
                          <span className="num">{sl.totalPoints}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
