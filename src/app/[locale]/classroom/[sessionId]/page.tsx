import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { resolveClassroomAccess } from "@/lib/classroom";
import { logAudit } from "@/lib/audit";
import { hasValidTechCheck } from "@/lib/teacher/tech-check-gate";
import { ClassroomClient } from "./classroom-client";

export const dynamic = "force-dynamic";

export default async function ClassroomPage({
  params,
}: {
  params: Promise<{ locale: string; sessionId: string }>;
}) {
  const { locale, sessionId } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const t = await getTranslations("Classroom");
  const access = await resolveClassroomAccess(sessionId, session.user.id, session.user.role);

  // Error / blocked states — bilingual, on-brand.
  if (!access.ok) {
    const messages: Record<string, string> = {
      NOT_FOUND: t("errNotFound"),
      NOT_AUTHORIZED: t("errNotAuthorized"),
      TOO_EARLY: t("errTooEarly"),
      ENDED: t("errEnded"),
      NOT_STARTED: t("errNotStarted"),
    };
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-brand-navy p-6 text-center text-white">
        <div className="rounded-2xl bg-white/10 p-10 backdrop-blur">
          <h1 className="text-xl font-bold">{t("cannotJoin")}</h1>
          <p className="mt-3 max-w-sm text-sm text-white/80">
            {messages[access.reason ?? "NOT_FOUND"]}
          </p>
          <Link
            href={`/${locale}`}
            className="mt-6 inline-block rounded-lg bg-hajr-deep-navy px-5 py-2 text-sm font-medium"
          >
            {t("backHome")}
          </Link>
        </div>
      </div>
    );
  }

  const s = access.session!;

  // Tech check gate — teachers only. Block entry unless they have a passing
  // check in the last 4 hours.
  if (session.user.role === "TEACHER") {
    const ok = await hasValidTechCheck(session.user.id);
    if (!ok) {
      const target = `/${locale}/classroom/${sessionId}`;
      redirect(`/${locale}/teacher/tech-check?return=${encodeURIComponent(target)}`);
    }
  }

  if (!s.meetingId) {
    // Meeting not created yet — host must Start Class first.
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-brand-navy p-6 text-center text-white">
        <div className="rounded-2xl bg-white/10 p-10 backdrop-blur">
          <h1 className="text-xl font-bold">{t("notStartedTitle")}</h1>
          <p className="mt-3 max-w-sm text-sm text-white/80">
            {access.role === "host" ? t("hostStartHint") : t("errNotStarted")}
          </p>
          <Link
            href={`/${locale}`}
            className="mt-6 inline-block rounded-lg bg-hajr-deep-navy px-5 py-2 text-sm font-medium"
          >
            {t("backHome")}
          </Link>
        </div>
      </div>
    );
  }

  const displayName =
    session.user.role === "PARENT"
      ? `[ولي أمر] ${session.user.name ?? "Parent"}`
      : session.user.name ?? "Participant";

  // Audit a parent observing a class.
  if (session.user.role === "PARENT") {
    await logAudit({
      userId: session.user.id,
      action: "PARENT_OBSERVED_CLASS",
      entity: "ClassSession",
      entityId: s.id,
      metadata: { meetingId: s.meetingId },
    });
  }

  return (
    <ClassroomClient
      meetingNumber={s.meetingId}
      passcode={s.passcode ?? ""}
      joinUrl={s.joinUrl ?? ""}
      userName={displayName}
      userEmail={session.user.email ?? ""}
      role={access.role!}
      title={s.title}
      locale={locale}
    />
  );
}
