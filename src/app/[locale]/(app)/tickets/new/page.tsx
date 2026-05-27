/**
 * Sprint 3 — New ticket form.
 */
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/rbac";
import { NewTicketForm } from "@/components/tickets/NewTicketForm";

export const dynamic = "force-dynamic";

export default async function NewTicketPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireSession();
  const t = await getTranslations("Tickets");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hajr-text">{t("newTicket")}</h1>
        <p className="mt-1 text-sm text-hajr-muted">{t("newTicketSubtitle")}</p>
      </div>
      <NewTicketForm locale={locale} />
    </div>
  );
}
