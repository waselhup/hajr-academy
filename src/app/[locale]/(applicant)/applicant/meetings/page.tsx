import { getTranslations } from "next-intl/server";
import { CalendarCheck, CalendarClock, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireApplicantFeature } from "@/lib/applicants/guard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/**
 * Applicant meetings — their scheduled interview(s). Reuses the existing
 * CalendarEvent primitive (an admin creates a MEETING event with userId = the
 * applicant's user). Gated behind the MEETINGS feature.
 */
export default async function ApplicantMeetingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { session } = await requireApplicantFeature("MEETINGS");
  const t = await getTranslations("Applicant");
  const isAr = locale === "ar";

  let loadError = false;
  let events: Awaited<ReturnType<typeof loadEvents>> = [];

  async function loadEvents() {
    return prisma.calendarEvent.findMany({
      where: {
        userId: session.user.id,
        type: { in: ["MEETING", "CUSTOM"] },
        endAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      orderBy: { startAt: "asc" },
      take: 25,
    });
  }

  try {
    events = await loadEvents();
  } catch (e) {
    console.error("[applicant/meetings] load failed:", e);
    loadError = true;
  }

  const fmt = new Intl.DateTimeFormat(isAr ? "ar-SA-u-nu-latn" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  function meetingUrl(metadata: unknown): string | null {
    if (metadata && typeof metadata === "object") {
      const m = metadata as Record<string, unknown>;
      const url = m.joinUrl ?? m.zoomJoinUrl ?? m.url ?? m.link;
      if (typeof url === "string" && url.startsWith("http")) return url;
    }
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5" dir={isAr ? "rtl" : "ltr"}>
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-hajr-deep-navy">
          <CalendarCheck className="h-6 w-6 text-hajr-rose" />
          {t("meetingsTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("meetingsSubtitle")}</p>
      </header>

      {loadError ? (
        <Card className="border-hajr-error/30 bg-hajr-error/5">
          <CardContent className="p-6 text-sm text-hajr-error">{t("meetingsError")}</CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <CalendarClock className="h-8 w-8 text-hajr-gray-300" />
            {t("meetingsEmpty")}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => {
            const url = meetingUrl(ev.metadata);
            const upcoming = +ev.startAt > Date.now();
            return (
              <li key={ev.id}>
                <Card>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-hajr-deep-navy">
                          {isAr ? ev.titleAr : ev.title}
                        </p>
                        <p className="mt-0.5 text-sm text-hajr-muted">{fmt.format(ev.startAt)}</p>
                      </div>
                      <Badge variant={upcoming ? "info" : "draft"}>
                        {upcoming ? t("meetingUpcoming") : t("meetingPast")}
                      </Badge>
                    </div>
                    {(isAr ? ev.descriptionAr : ev.description) && (
                      <p className="text-sm text-muted-foreground">
                        {isAr ? ev.descriptionAr : ev.description}
                      </p>
                    )}
                    {url && upcoming && (
                      <Button asChild variant="cta" size="sm">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <Video className="me-1.5 h-4 w-4" />
                          {t("meetingJoin")}
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
