import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeacherAttendanceHub({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("TEACHER");
  const t = await getTranslations();

  const profile = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return <p className="text-sm text-muted-foreground">{t("Common.noData")}</p>;

  // Recent + current sessions worth marking.
  const sessions = await prisma.classSession.findMany({
    where: {
      class: { teacherId: profile.id },
      scheduledDate: { gte: new Date(Date.now() - 30 * 86400_000) },
    },
    include: {
      class: { include: { _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } } },
      _count: { select: { attendances: true } },
    },
    orderBy: { scheduledDate: "desc" },
    take: 40,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-brand-rose" />
        <h1 className="text-2xl font-bold">{t("Nav.attendance")}</h1>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{t("Common.noData")}</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{s.class.nameAr ?? s.class.name}</p>
                  <p className="text-xs text-muted-foreground num">
                    {s.scheduledDate.toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={s.status === "COMPLETED" ? "success" : s.status === "LIVE" ? "rose" : "info"}>
                    {s.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground num">
                    {s._count.attendances}/{s.class._count.enrollments}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/${locale}/teacher/attendance/${s.id}`}>{t("Video.takeAttendance")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
