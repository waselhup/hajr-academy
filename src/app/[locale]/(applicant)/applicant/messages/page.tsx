import { getTranslations } from "next-intl/server";
import { MessageSquare } from "lucide-react";
import { requireApplicantFeature } from "@/lib/applicants/guard";
import { MessagesClient } from "@/app/[locale]/(app)/messages/messages-client";

export const dynamic = "force-dynamic";

/**
 * Applicant messages — chat with the ADMIN ONLY. The messaging system is
 * hard-scoped server-side (lib/comms/permissions.ts → APPLICANT can only reach
 * admins), so reusing MessagesClient here is safe: the recipient picker and the
 * send endpoint both refuse anyone but an admin.
 */
export default async function ApplicantMessagesPage() {
  const { session } = await requireApplicantFeature("MESSAGING");
  const t = await getTranslations("Applicant");

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-hajr-deep-navy">
          <MessageSquare className="h-6 w-6 text-hajr-rose" />
          {t("messagesTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("messagesSubtitle")}</p>
      </header>
      <MessagesClient currentUserId={session.user.id} currentRole={session.user.role} />
    </div>
  );
}
