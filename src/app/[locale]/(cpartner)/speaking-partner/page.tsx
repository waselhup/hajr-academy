import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Video, Users, Globe, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

const KSA_TZ = "Asia/Riyadh";

/**
 * /speaking-partner — everything a conversation partner needs, and nothing
 * else: the sessions they were invited to, with the link to join.
 *
 * Times are shown twice on purpose — in KSA time, because that is what the
 * academy and the students work to, and in the partner's own zone, because
 * they are abroad and that is the number they will act on.
 */
export default async function SpeakingPartnerHome() {
  const session = await requireRole("CONVERSATION_PARTNER");
  const locale = await getLocale();
  const isAr = locale === "ar";

  const profile = await prisma.conversationPartnerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, country: true, nativeLanguage: true, timezone: true, availability: true, isActive: true },
  });

  const sessions = profile
    ? await prisma.speakingClubEvent.findMany({
        where: { conversationPartnerId: profile.id },
        orderBy: { scheduledAt: "asc" },
        take: 100,
        include: { _count: { select: { rsvps: true } } },
      })
    : [];

  const now = Date.now();
  const upcoming = sessions.filter((s) => s.scheduledAt.getTime() >= now - 2 * 3600_000);
  const past = sessions.filter((s) => s.scheduledAt.getTime() < now - 2 * 3600_000).reverse();

  const fmt = (d: Date, tz: string) =>
    new Intl.DateTimeFormat("en-GB", {
      weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
      timeZone: tz,
    }).format(d);

  const partnerTz = (() => {
    // The applicant typed this freely ("GMT+1", "Europe/London"); only a real
    // IANA zone can be formatted, so fall back to KSA rather than throwing.
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: profile?.timezone ?? KSA_TZ });
      return profile?.timezone ?? KSA_TZ;
    } catch {
      return null;
    }
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hajr-deep-navy">
          {isAr ? `أهلاً ${session.user.name ?? ""}` : `Welcome, ${session.user.name ?? ""}`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr
            ? "هذه جلسات المحادثة المدعو إليها. رابط الدخول يظهر هنا قبل موعد الجلسة."
            : "These are the conversation sessions you're invited to. The joining link appears here before each one."}
        </p>
      </div>

      {profile && !profile.isActive && (
        <div className="rounded-card border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {isAr
            ? "حسابك موقوف مؤقتاً. تواصل مع الأكاديمية."
            : "Your partner account is paused. Please contact the academy."}
        </div>
      )}

      {/* Upcoming */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5" />
            {isAr ? `الجلسات القادمة (${upcoming.length})` : `Upcoming sessions (${upcoming.length})`}
          </CardTitle>
          {partnerTz && partnerTz !== KSA_TZ && (
            <CardDescription>
              {isAr
                ? `الأوقات معروضة بتوقيت السعودية وبتوقيتك (${partnerTz}).`
                : `Times are shown in KSA time and in your own zone (${partnerTz}).`}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {upcoming.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {isAr
                ? "لا توجد جلسات مجدولة بعد. ستصلك رسالة عند تعيينك على جلسة."
                : "No sessions scheduled yet. You'll be notified when you're assigned to one."}
            </p>
          ) : (
            <div className="divide-y divide-hajr-border">
              {upcoming.map((s) => {
                const live =
                  Math.abs(s.scheduledAt.getTime() - now) < 15 * 60_000 ||
                  (s.scheduledAt.getTime() <= now &&
                    now < s.scheduledAt.getTime() + s.durationMin * 60_000);
                return (
                  <div key={s.id} className="space-y-2 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{isAr ? s.titleAr : s.titleEn}</div>
                        {(isAr ? s.descriptionAr : s.descriptionEn) && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {isAr ? s.descriptionAr : s.descriptionEn}
                          </p>
                        )}
                      </div>
                      {live && <Badge variant="danger">{isAr ? "الآن" : "Live now"}</Badge>}
                    </div>

                    <div className="num text-sm" dir="ltr">
                      {fmt(s.scheduledAt, KSA_TZ)} <span className="text-muted-foreground">(KSA)</span>
                    </div>
                    {partnerTz && partnerTz !== KSA_TZ && (
                      <div className="num text-sm text-hajr-navy" dir="ltr">
                        {fmt(s.scheduledAt, partnerTz)}{" "}
                        <span className="text-muted-foreground">({isAr ? "بتوقيتك" : "your time"})</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="num">{s.durationMin}</span> {isAr ? "دقيقة" : "min"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span className="num">{s._count.rsvps}</span>{" "}
                        {isAr ? "طالب مسجّل" : "students signed up"}
                      </span>
                    </div>

                    {s.zoomJoinUrl ? (
                      <Button variant="cta" size="sm" asChild>
                        <a href={s.zoomJoinUrl} target="_blank" rel="noopener noreferrer">
                          <Video className="me-2 h-4 w-4" />
                          {isAr ? "دخول الجلسة" : "Join the session"}
                        </a>
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {isAr
                          ? "رابط الدخول لم يُجهَّز بعد — سيظهر هنا."
                          : "The joining link isn't ready yet — it will appear here."}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Your details — read-only; the academy schedules around them */}
      {profile && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isAr ? "بياناتك" : "Your details"}</CardTitle>
            <CardDescription>
              {isAr
                ? "نجدول الجلسات وفق هذه المعلومات. لتعديلها راسل الأكاديمية."
                : "We schedule around these. To change them, message the academy."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Detail
              icon={<Globe className="h-4 w-4" />}
              label={isAr ? "الدولة" : "Country"}
              value={profile.country}
            />
            <Detail
              icon={<Users className="h-4 w-4" />}
              label={isAr ? "اللغة الأم" : "Native language"}
              value={profile.nativeLanguage}
            />
            <Detail
              icon={<Clock className="h-4 w-4" />}
              label={isAr ? "المنطقة الزمنية" : "Time zone"}
              value={profile.timezone}
              ltr
            />
            {profile.availability && (
              <div className="sm:col-span-2">
                <div className="text-xs text-muted-foreground">
                  {isAr ? "أوقاتك المتاحة" : "Your availability"}
                </div>
                <p className="mt-0.5 whitespace-pre-line text-sm">{profile.availability}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isAr ? `جلسات سابقة (${past.length})` : `Past sessions (${past.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-hajr-border p-0">
            {past.slice(0, 20).map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="flex-1 font-medium">{isAr ? s.titleAr : s.titleEn}</span>
                <span className="num text-xs text-muted-foreground" dir="ltr">
                  {fmt(s.scheduledAt, KSA_TZ)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Detail({
  icon, label, value, ltr,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-0.5 font-medium ${ltr ? "num" : ""}`} dir={ltr ? "ltr" : undefined}>
        {value}
      </div>
    </div>
  );
}
