import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ClassDetailActions } from "./_components/class-detail-actions";
import { RescheduleSessionButton } from "@/components/video/reschedule-session-button";
import { fmtRiyadh, fmtSAR } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const dynamic = "force-dynamic";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: "ar" | "en" }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const { id, locale } = await params;
  const t = await getTranslations();

  let cls: any;
  let availableStudents: any[] = [];

  try {
    cls = await prisma.class.findUnique({
      where: { id },
      include: {
        program: true,
        teacher: { include: { user: { select: { name: true, nameAr: true, email: true } } } },
        enrollments: {
          where: { status: "ACTIVE" },
          include: { student: { include: { user: { select: { name: true, nameAr: true, email: true } } } } },
        },
        sessions: { orderBy: { scheduledDate: "desc" }, take: 50 },
        assignments: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!cls) notFound();

    availableStudents = await prisma.studentProfile.findMany({
      where: {
        enrollments: { none: { classId: id, status: "ACTIVE" } },
        ...(cls.genderRestriction ? { gender: cls.genderRestriction } : {}),
      },
      include: { user: { select: { name: true, nameAr: true } } },
      take: 200,
    });
  } catch (e) {
    console.error("[admin-class-detail] DB query failed:", e);
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/classes" className="text-sm text-muted-foreground hover:text-brand-rose">← {t("Classes.title")}</Link>
          <h1 className="mt-2 text-2xl font-bold">{locale === "ar" && cls.nameAr ? cls.nameAr : cls.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="info">{cls.cohortCode}</Badge>
            <Badge variant="success">{t("ClassStatus." + cls.status as any)}</Badge>
            <span className="text-muted-foreground">{t("Programs." + cls.program.code as any)}</span>
          </div>
        </div>
        <ClassDetailActions
          classId={cls.id}
          availableStudents={availableStudents.map((s: any) => ({
            id: s.id,
            name: s.user.name,
            nameAr: s.user.nameAr ?? null,
          }))}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label={t("Classes.teacher")} value={cls.teacher.user.name} />
        <StatTile label={t("Classes.schedule")} value={`${cls.scheduleDays.length} ${t("Common.of")} 7`} sub={cls.timeSlot} />
        <StatTile label={t("Classes.enrolled")} value={`${cls.enrollments.length} / ${cls.maxStudents}`} />
        <StatTile label={t("Classes.pricePerMonth")} value={fmtSAR(Number(cls.pricePerMonth), locale)} />
      </div>

      <Tabs defaultValue="roster">
        <TabsList>
          <TabsTrigger value="roster">{t("Classes.roster")}</TabsTrigger>
          <TabsTrigger value="sessions">{t("Classes.sessions")}</TabsTrigger>
          <TabsTrigger value="assignments">{t("Classes.assignments")}</TabsTrigger>
        </TabsList>

        <TabsContent value="roster">
          <Card>
            <CardHeader>
              <CardTitle>{t("Classes.roster")}</CardTitle>
              {cls.genderRestriction && (
                <p className="text-xs text-muted-foreground">{t("Common.rosterRespectsGender")}: <Badge variant="rose">{t("Common." + cls.genderRestriction.toLowerCase() as any)}</Badge></p>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Common.name")}</TableHead>
                    <TableHead>{t("Common.email")}</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cls.enrollments.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground p-6">{t("Common.noData")}</TableCell></TableRow>
                  ) : cls.enrollments.map((en: any) => (
                    <TableRow key={en.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7"><AvatarFallback>{en.student.user.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                          {locale === "ar" && en.student.user.nameAr ? en.student.user.nameAr : en.student.user.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{en.student.user.email}</TableCell>
                      <TableCell>
                        <ClassDetailActions classId={cls.id} unenrollId={en.id} variant="row" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader><CardTitle>{t("Classes.sessions")}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>{t("Common.status")}</TableHead>
                    <TableHead className="text-end">{t("Common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cls.sessions.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground p-6">{t("Common.noData")}</TableCell></TableRow>
                  ) : cls.sessions.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="num">{fmtRiyadh(s.scheduledDate, "yyyy-MM-dd HH:mm")}</TableCell>
                      <TableCell><Badge variant={s.status === "LIVE" ? "rose" : "info"}>{s.status}</Badge></TableCell>
                      <TableCell className="text-end">
                        {s.status === "SCHEDULED" && (
                          <RescheduleSessionButton
                            sessionId={s.id}
                            scheduledDate={s.scheduledDate.toISOString()}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader><CardTitle>{t("Classes.assignments")}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t("Common.comingSoon")}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-lg font-semibold num">{value}</div>
        {sub && <div className="text-xs text-muted-foreground num">{sub}</div>}
      </CardContent>
    </Card>
  );
}
