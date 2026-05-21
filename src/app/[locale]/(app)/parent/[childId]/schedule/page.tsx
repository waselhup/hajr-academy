import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UpcomingSessionCard } from "@/components/video/upcoming-session-card";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ParentChildSchedulePage({
  params,
}: {
  params: Promise<{ locale: string; childId: string }>;
}) {
  const { locale, childId } = await params;
  const session = await requireRole("PARENT");
  const t = await getTranslations();

  let student: any = null;
  let sessions: any[] = [];

  try {
    const parent = await prisma.parentProfile.findUnique({
      where: { userId: session.user.id },
      include: { childLinks: true },
    });
    if (!parent || !parent.childLinks.some((l) => l.studentId === childId)) {
      notFound();
    }

    student = await prisma.studentProfile.findUnique({
      where: { id: childId },
      include: {
        user: true,
        enrollments: { where: { status: "ACTIVE" } },
      },
    });
    if (!student) notFound();

    const classIds = student.enrollments.map((e: any) => e.classId);
    const horizon = new Date(Date.now() + 14 * 86400_000);
    if (classIds.length > 0) {
      sessions = await prisma.classSession.findMany({
        where: {
          classId: { in: classIds },
          OR: [
            { status: "LIVE" },
            { status: "SCHEDULED", scheduledDate: { gte: new Date(Date.now() - 3600_000), lte: horizon } },
          ],
        },
        include: { class: true },
        orderBy: { scheduledDate: "asc" },
      });
    }
  } catch (e) {
    console.error("[parent-child-schedule] DB query failed:", e);
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${locale}/parent`}>
            <ArrowLeft className="h-5 w-5 rtl-flip" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">
          {t("Nav.schedule")} — {student.user.nameAr ?? student.user.name}
        </h1>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t("Video.noUpcoming")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s: any) => (
            <UpcomingSessionCard
              key={s.id}
              mode="observe"
              locale={locale}
              session={{
                id: s.id,
                kind: "classSession",
                title: s.class.nameAr ?? s.class.name,
                subtitle: s.class.cohortCode,
                scheduledDate: s.scheduledDate.toISOString(),
                durationMinutes: s.class.durationMinutes,
                status: s.status,
                hasMeeting: !!s.zoomMeetingId,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
