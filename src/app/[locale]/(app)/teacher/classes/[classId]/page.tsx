import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, ClipboardCheck, FolderOpen } from "lucide-react";
import { ClassResourcesTab, type ResourceVM } from "./class-resources-tab";

export const dynamic = "force-dynamic";

const DAY_AR: Record<string, string> = {
  SUNDAY: "الأحد",
  MONDAY: "الإثنين",
  TUESDAY: "الثلاثاء",
  WEDNESDAY: "الأربعاء",
  THURSDAY: "الخميس",
  FRIDAY: "الجمعة",
  SATURDAY: "السبت",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function TeacherClassDetailPage({
  params,
}: {
  params: Promise<{ locale: string; classId: string }>;
}) {
  const { locale, classId } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations();

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) notFound();

  const cls = await prisma.class.findFirst({
    where: { id: classId, teacherId: profile.id },
    include: {
      program: true,
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          student: {
            include: {
              user: { select: { name: true, nameAr: true, avatar: true } },
            },
          },
        },
      },
      sessions: {
        orderBy: { scheduledDate: "desc" },
        take: 20,
        include: {
          attendances: { select: { id: true } },
        },
      },
      // Class-scoped teaching materials — persist with the class across terms,
      // so a returning/future assigned teacher finds all prior resources here.
      resources: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          kind: true,
          category: true,
          title: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
          uploadedByUserId: true,
        },
      },
    },
  });
  if (!cls) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-destructive">
            {locale === "ar" ? "غير مصرّح." : "Not authorized."}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href={`/${locale}/teacher/classes`}>{t("Nav.myClasses")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const displayName = locale === "ar" ? cls.nameAr ?? cls.name : cls.name;

  const resources: ResourceVM[] = cls.resources.map((r) => ({
    id: r.id,
    kind: r.kind as ResourceVM["kind"],
    category: r.category as ResourceVM["category"],
    title: r.title,
    fileName: r.fileName,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    createdAt: r.createdAt.toISOString(),
    mine: r.uploadedByUserId === session.user.id,
  }));

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/${locale}/teacher/classes`}>
          <ArrowLeft className="me-2 h-4 w-4 rtl-flip" />
          {t("Nav.myClasses")}
        </Link>
      </Button>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-brand-navy">{displayName}</h1>
              <p className="mt-1 text-xs text-muted-foreground num">{cls.cohortCode}</p>
            </div>
            <Badge variant={cls.status === "ACTIVE" ? "success" : "default"}>{cls.status}</Badge>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{locale === "ar" ? cls.program.nameAr : cls.program.nameEn}</span>
            <span>•</span>
            <span>
              {cls.scheduleDays.map((d) => (locale === "ar" ? DAY_AR[d] : d.slice(0, 3))).join("، ")}{" "}
              <span className="num">{cls.timeSlot}</span>
            </span>
            <span>•</span>
            <span className="num">
              {cls.enrollments.length} / {cls.maxStudents}
            </span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="roster" className="w-full">
        <TabsList>
          <TabsTrigger value="roster">{t("Classes.roster")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("Nav.attendance")}</TabsTrigger>
          <TabsTrigger value="resources">{t("ClassResources.tab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="roster">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("Classes.roster")}{" "}
                <span className="num text-muted-foreground">({cls.enrollments.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cls.enrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {locale === "ar" ? "لا يوجد طلاب." : "No students."}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {cls.enrollments.map((e) => (
                    <Link
                      key={e.id}
                      href={`/${locale}/teacher/students/${e.studentId}`}
                      className="flex items-center gap-3 rounded-md border bg-muted/30 p-3 text-sm transition-colors hover:bg-muted"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">
                          {initials(e.student.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">
                        {locale === "ar" && e.student.user.nameAr
                          ? e.student.user.nameAr
                          : e.student.user.name}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                {t("Nav.attendance")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cls.sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {locale === "ar" ? "لا توجد جلسات بعد." : "No sessions yet."}
                </p>
              ) : (
                <div className="space-y-2">
                  {cls.sessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-3 text-sm"
                    >
                      <div>
                        <p className="num text-xs text-muted-foreground">
                          {s.scheduledDate.toLocaleString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US")}
                        </p>
                        <Badge
                          variant={s.status === "COMPLETED" ? "success" : "default"}
                          className="mt-1 text-[10px]"
                        >
                          {s.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {s.attendances.length} / {cls.enrollments.length}
                        </span>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/${locale}/teacher/attendance/${s.id}`}>
                            {t("TeacherStudents.markAttendance")}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                {t("ClassResources.tab")}{" "}
                <span className="num text-muted-foreground">({resources.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ClassResourcesTab
                classId={cls.id}
                locale={locale}
                initialResources={resources}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
