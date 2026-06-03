import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventCreateForm } from "./_components/create-form";

export const dynamic = "force-dynamic";

export default async function AdminSpeakingClubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("SpeakingClub");
  const isAr = locale === "ar";

  const [events, teachers] = await Promise.all([
    prisma.speakingClubEvent.findMany({
      orderBy: { scheduledAt: "desc" },
      include: {
        hostTeacher: { include: { user: { select: { name: true } } } },
        _count: { select: { rsvps: true } },
      },
      take: 50,
    }),
    prisma.teacherProfile.findMany({
      where: { active: true },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <header>
        <h1 className="text-2xl font-bold text-hajr-deep-navy">{t("pageTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr ? "إدارة فعاليات نادي المحادثة" : "Manage Speaking Club events"}
        </p>
      </header>

      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold text-hajr-deep-navy mb-3">
            {isAr ? "إنشاء فعالية" : "Create event"}
          </h2>
          <EventCreateForm
            teachers={teachers.map((t) => ({ id: t.id, name: t.user.name }))}
            locale={locale}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold text-hajr-deep-navy">
            {isAr ? "كل الفعاليات" : "All events"}
          </h2>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              {isAr ? "لا توجد فعاليات بعد" : "No events yet"}
            </p>
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <Link
                  key={e.id}
                  href={`/admin/speaking-club/${e.id}`}
                  className="flex items-center justify-between p-3 border border-hajr-border rounded-md hover:bg-hajr-ivory min-h-[44px]"
                >
                  <div>
                    <div className="font-semibold text-hajr-deep-navy">
                      {isAr ? e.titleAr : e.titleEn}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {e.scheduledAt.toLocaleString(isAr ? "ar-SA" : "en-US")}
                      {e.hostTeacher ? ` · ${e.hostTeacher.user.name}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {e._count.rsvps} / {e.maxAttendees}
                    </Badge>
                    <Badge
                      className={
                        e.status === "UPCOMING"
                          ? "bg-hajr-rose text-white"
                          : e.status === "LIVE"
                          ? "bg-hajr-success text-white"
                          : "bg-muted text-foreground"
                      }
                    >
                      {e.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
