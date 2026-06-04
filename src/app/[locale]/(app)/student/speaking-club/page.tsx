import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RsvpButton } from "./_components/rsvp-button";
import { Mic, Users, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

function fmtDateTime(d: Date, isAr: boolean): string {
  return d.toLocaleString(isAr ? "ar-SA-u-nu-latn" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function StudentSpeakingClubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireRole("STUDENT");
  const t = await getTranslations("SpeakingClub");
  const isAr = locale === "ar";

  const sp = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  const studentId = sp?.id;

  const now = new Date();
  const fifteenMinAhead = new Date(now.getTime() + 15 * 60_000);

  const [upcoming, myRsvps, past] = await Promise.all([
    prisma.speakingClubEvent.findMany({
      where: { status: "UPCOMING", scheduledAt: { gt: now } },
      include: {
        hostTeacher: { include: { user: { select: { name: true, avatar: true } } } },
        _count: { select: { rsvps: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 12,
    }),
    studentId
      ? prisma.speakingClubRSVP.findMany({
          where: { studentId, event: { scheduledAt: { gt: now } } },
          include: { event: true },
          orderBy: { event: { scheduledAt: "asc" } },
        })
      : Promise.resolve([]),
    prisma.speakingClubEvent.findMany({
      where: {
        OR: [{ status: "ENDED" }, { scheduledAt: { lt: now } }],
      },
      include: {
        hostTeacher: { include: { user: { select: { name: true } } } },
        _count: { select: { rsvps: true } },
      },
      orderBy: { scheduledAt: "desc" },
      take: 8,
    }),
  ]);

  const myRsvpSet = new Set(myRsvps.map((r) => r.eventId));

  return (
    <div className="container mx-auto px-4 py-6 space-y-8" dir={isAr ? "rtl" : "ltr"}>
      <header>
        <h1 className="text-2xl font-bold text-hajr-deep-navy flex items-center gap-2">
          <Mic className="h-7 w-7 text-hajr-rose" />
          {t("pageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr
            ? "تدرّب على التحدث مع الزملاء والمعلمين في جلسات أسبوعية"
            : "Practice speaking with peers and teachers in weekly live sessions"}
        </p>
      </header>

      {myRsvps.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-hajr-deep-navy">
            {t("myRsvps")}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myRsvps.map(({ event: e }) => {
              const isLive = e.scheduledAt <= fifteenMinAhead && e.scheduledAt >= new Date(now.getTime() - e.durationMin * 60_000);
              return (
                <Card key={e.id} className="border-hajr-rose">
                  <CardContent className="p-4 space-y-2">
                    {isLive ? (
                      <Badge className="bg-hajr-rose text-white animate-pulse">
                        {t("liveNow")}
                      </Badge>
                    ) : null}
                    <h3 className="font-semibold text-hajr-deep-navy">
                      {isAr ? e.titleAr : e.titleEn}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {fmtDateTime(e.scheduledAt, isAr)}
                    </p>
                    {isLive && e.zoomJoinUrl ? (
                      <a
                        href={e.zoomJoinUrl}
                        target="_blank"
                        rel="noopener"
                        className="block bg-hajr-rose text-white px-4 py-3 rounded-md text-center font-semibold min-h-[44px]"
                      >
                        {t("joinNow")}
                      </a>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-hajr-deep-navy">
          {t("upcoming")}
        </h2>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {isAr ? "لا توجد أحداث قادمة" : "No upcoming events"}
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((e) => (
              <Card key={e.id} className="border-hajr-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-hajr-deep-navy">
                      {isAr ? e.titleAr : e.titleEn}
                    </h3>
                    {e.minLevel ? (
                      <Badge variant="outline" className="shrink-0">
                        {e.minLevel}+
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {fmtDateTime(e.scheduledAt, isAr)} · {e.durationMin}m
                  </p>
                  {e.hostTeacher ? (
                    <p className="text-xs text-hajr-navy">
                      {t("host")}: {e.hostTeacher.user.name}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {e._count.rsvps} / {e.maxAttendees}
                    </span>
                  </div>
                  <RsvpButton
                    eventId={e.id}
                    initialRsvp={myRsvpSet.has(e.id)}
                    isFull={e._count.rsvps >= e.maxAttendees}
                    locale={locale}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {past.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-hajr-deep-navy">{t("past")}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {past.map((e) => (
              <Card key={e.id} className="border-hajr-border opacity-75">
                <CardContent className="p-3 space-y-1">
                  <h3 className="font-semibold text-sm">
                    {isAr ? e.titleAr : e.titleEn}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {fmtDateTime(e.scheduledAt, isAr)}
                  </p>
                  {e.recordingUrl ? (
                    <a
                      href={e.recordingUrl}
                      target="_blank"
                      rel="noopener"
                      className="text-xs text-hajr-rose underline"
                    >
                      {isAr ? "شاهد التسجيل" : "Watch recording"}
                    </a>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
