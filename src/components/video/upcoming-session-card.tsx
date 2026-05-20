import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SessionJoinButton } from "./session-join-button";

export interface UpcomingSession {
  id: string;
  kind: "classSession" | "privateLesson";
  title: string;
  scheduledDate: string;
  durationMinutes: number;
  status: string;
  hasMeeting: boolean;
  subtitle?: string;
}

/**
 * Shared card used on teacher / student / parent dashboards to surface a
 * session with its start/join/observe action.
 */
export function UpcomingSessionCard({
  session,
  mode,
  locale,
}: {
  session: UpcomingSession;
  mode: "start" | "join" | "observe";
  locale: string;
}) {
  const isLive = session.status === "LIVE";
  const date = new Date(session.scheduledDate);
  const dateStr = date.toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Riyadh",
  });

  return (
    <Card className={isLive ? "ring-2 ring-brand-rose" : ""}>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-brand-navy">{session.title}</h3>
            {isLive && <Badge variant="rose">●</Badge>}
          </div>
          {session.subtitle && (
            <p className="text-sm text-muted-foreground">{session.subtitle}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="num">{dateStr}</span>
          </p>
        </div>
        <SessionJoinButton
          sessionId={session.id}
          kind={session.kind}
          mode={mode}
          scheduledDate={session.scheduledDate}
          durationMinutes={session.durationMinutes}
          status={session.status}
          hasMeeting={session.hasMeeting}
        />
      </CardContent>
    </Card>
  );
}
