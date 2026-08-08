import { SessionProvider } from "@/components/providers/session-provider";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { NotificationBell } from "@/components/shared/notification-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HajrLogo } from "@/components/brand/logo";
import { requireRole } from "@/lib/rbac";

/**
 * Shell for the conversation-partner portal.
 *
 * Deliberately the smallest shell on the platform: no sidebar, no modules.
 * A conversation partner is a guest of the academy, not staff — everything
 * they need is the sessions they were invited to, so that is all this
 * renders. Role-gated to CONVERSATION_PARTNER; every page re-checks.
 */
export default async function ConversationPartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("CONVERSATION_PARTNER");

  const name = session.user.name ?? "Partner";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-hajr-ivory">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-hajr-border bg-white px-4 shadow-sm sm:px-6">
          <HajrLogo className="h-8 w-auto" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="hidden text-sm font-semibold text-hajr-deep-navy sm:inline">
              {name}
            </span>
            <LanguageToggle />
            <NotificationBell userId={session.user.id} />
            <Avatar className="h-9 w-9 ring-2 ring-hajr-border">
              <AvatarFallback className="bg-hajr-navy text-sm font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </SessionProvider>
  );
}
