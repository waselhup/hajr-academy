import { requireSession } from "@/lib/rbac";
import { getTranslations } from "next-intl/server";
import { UniversalCalendar } from "@/components/calendar/UniversalCalendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await requireSession();
  const t = await getTranslations("Calendar");
  const isAdmin =
    session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-hajr-text">{t("pageTitle")}</h1>
        <p className="mt-1 text-sm text-hajr-muted">{t("pageSubtitle")}</p>
      </div>
      <UniversalCalendar currentUserId={session.user.id} isAdmin={isAdmin} />
    </div>
  );
}
