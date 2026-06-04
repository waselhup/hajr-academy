import { getTranslations } from "next-intl/server";
import { Bell, MessageSquare, Megaphone, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireApplicant } from "@/lib/applicants/guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageStrip } from "@/components/applicant/stage-strip";

export const dynamic = "force-dynamic";

type FeedItem = {
  id: string;
  kind: "message" | "notification";
  title: string;
  body: string;
  at: Date;
};

export default async function ApplicantOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { session, applicant } = await requireApplicant();
  const t = await getTranslations("Applicant");
  const isAr = locale === "ar";

  // Resolve the stage-strip labels server-side (StageStrip stays presentational).
  const stripLabels = {
    "Applicant.stageReceived": t("stageReceived"),
    "Applicant.stageInterview": t("stageInterview"),
    "Applicant.stageTest": t("stageTest"),
    "Applicant.stageDemo": t("stageDemo"),
    "Applicant.stageDecision": t("stageDecision"),
  };

  let loadError = false;
  let feed: FeedItem[] = [];

  try {
    const [notifications, messages] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.message.findMany({
        where: { toUserId: session.user.id, channel: "IN_APP", triggerType: "MANUAL" },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { fromUser: { select: { name: true } } },
      }),
    ]);

    const notifItems: FeedItem[] = notifications.map((n) => ({
      id: `n_${n.id}`,
      kind: "notification",
      title: isAr ? n.titleAr : n.title,
      body: isAr ? n.bodyAr : n.body,
      at: n.createdAt,
    }));
    const msgItems: FeedItem[] = messages.map((m) => ({
      id: `m_${m.id}`,
      kind: "message",
      title: m.subject || `${t("messageFrom")} ${m.fromUser?.name ?? "Hajr Academy"}`,
      body: m.body,
      at: m.createdAt,
    }));

    feed = [...notifItems, ...msgItems].sort((a, b) => +b.at - +a.at).slice(0, 40);
  } catch (e) {
    console.error("[applicant/overview] feed load failed:", e);
    loadError = true;
  }

  const dateFmt = new Intl.DateTimeFormat(isAr ? "ar-SA-u-nu-latn" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Warm welcome header */}
      <header className="rounded-2xl bg-gradient-to-br from-hajr-deep-navy to-hajr-navy p-6 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-hajr-rose" />
          <h1 className="text-xl font-bold sm:text-2xl">
            {t("welcomeHeading", { name: applicant.fullName })}
          </h1>
        </div>
        <p className="mt-1.5 text-sm text-white/75">{t("welcomeSub")}</p>
      </header>

      {/* Stage progress strip */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-hajr-deep-navy">{t("journeyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <StageStrip current={applicant.stage} labels={stripLabels} />
        </CardContent>
      </Card>

      {/* Feed: announcements + messages from Hajr Academy */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-hajr-deep-navy">
          <Megaphone className="h-5 w-5 text-hajr-rose" />
          {t("feedTitle")}
        </h2>

        {loadError ? (
          <Card className="border-hajr-error/30 bg-hajr-error/5">
            <CardContent className="p-6 text-sm text-hajr-error">{t("feedError")}</CardContent>
          </Card>
        ) : feed.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 text-hajr-gray-300" />
              {t("feedEmpty")}
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {feed.map((item) => {
              const Icon = item.kind === "message" ? MessageSquare : Bell;
              return (
                <li key={item.id}>
                  <Card>
                    <CardContent className="flex gap-3 p-4">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hajr-rose/10 text-hajr-rose">
                        <Icon className="h-[1.05rem] w-[1.05rem]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-hajr-deep-navy">{item.title}</p>
                          <time className="shrink-0 text-xs text-hajr-muted">
                            {dateFmt.format(item.at)}
                          </time>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                          {item.body}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
