import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AttendanceForm } from "./_components/attendance-form";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSpeakingClubDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireRole("ADMIN");
  const t = await getTranslations("SpeakingClub");
  const isAr = locale === "ar";

  const event = await prisma.speakingClubEvent.findUnique({
    where: { id },
    include: {
      hostTeacher: { include: { user: { select: { name: true } } } },
      rsvps: {
        include: {
          student: {
            include: { user: { select: { name: true, nameAr: true, email: true } } },
          },
        },
      },
    },
  });
  if (!event) notFound();

  return (
    <div className="container mx-auto px-4 py-6 space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div>
        <Button asChild size="sm" variant="ghost" className="mb-2">
          <Link href={`/${locale}/admin/speaking-club`}>
            <ArrowLeft className="h-4 w-4 me-1" />
            {isAr ? "العودة" : "Back"}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-hajr-deep-navy">
          {isAr ? event.titleAr : event.titleEn}
        </h1>
        <p className="text-sm text-muted-foreground">
          {event.scheduledAt.toLocaleString(isAr ? "ar-SA" : "en-US")} ·{" "}
          {event.durationMin}m
        </p>
      </div>

      <Card>
        <CardContent className="p-4 grid sm:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold text-hajr-navy">{event.rsvps.length}</div>
            <div className="text-xs text-muted-foreground">{t("attendees")}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-hajr-navy">{event.maxAttendees}</div>
            <div className="text-xs text-muted-foreground">{t("maxAttendees")}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-hajr-navy">
              {event.minLevel || "—"}
            </div>
            <div className="text-xs text-muted-foreground">{t("level")}</div>
          </div>
          <div>
            <Badge
              className={
                event.status === "UPCOMING"
                  ? "bg-hajr-rose text-white"
                  : event.status === "LIVE"
                  ? "bg-hajr-success text-white"
                  : "bg-muted text-foreground"
              }
            >
              {event.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold text-hajr-deep-navy">
            {isAr ? "تسجيل الحضور" : "Attendance"}
          </h2>
          <AttendanceForm
            eventId={event.id}
            rsvps={event.rsvps.map((r) => ({
              studentId: r.studentId,
              name: isAr ? r.student.user.nameAr || r.student.user.name : r.student.user.name,
              email: r.student.user.email,
              attended: r.attended,
            }))}
            locale={locale}
          />
        </CardContent>
      </Card>
    </div>
  );
}
