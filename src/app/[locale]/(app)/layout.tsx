import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/shell/sidebar";
import { SidebarReopenHandle } from "@/components/shell/sidebar-reopen-handle";
import { Topbar } from "@/components/shell/topbar";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { SessionProvider } from "@/components/providers/session-provider";
import AdminCommandPalette from "@/components/admin/AdminCommandPalette";
import AdminChatPanel from "@/components/admin/AdminChatPanel";
import HajrChatPanel from "@/components/shared/HajrChatPanel";
import { PageVisitTracker } from "@/components/analytics/page-visit-tracker";
import { RatingPrompts } from "@/components/ratings/rating-prompts";
import { UpcomingReminders } from "@/components/shared/upcoming-reminders";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Preserve the active locale on the auth bounce — a hardcoded "/ar/login"
  // dropped English users into the Arabic login (the locale-stickiness bug).
  if (!session?.user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const isAdmin =
    session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";

  // The JWT session does not carry a fresh avatar (the session callback omits
  // `image`), so read it from the DB here. This also means it updates as soon
  // as the user uploads/removes a photo and router.refresh() re-renders.
  // `canViewTraffic` rides along on a query that was already happening, so the
  // sidebar can hide a link the user would only be redirected away from. Read
  // from the DB rather than the session token for the same reason the page's
  // own guard does: a JWT keeps whatever was stamped at sign-in, so revoking
  // the flag would otherwise leave the link there until the person logged out.
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatar: true, canViewTraffic: true },
  });

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen bg-brand-ivory">
        <Sidebar role={session.user.role} canViewTraffic={me?.canViewTraffic ?? false} />
        {/* Persistent re-open affordance — visible on every page/shell when the
            sidebar is collapsed (desktop) or hidden (mobile). See F7. */}
        <SidebarReopenHandle />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            userId={session.user.id}
            name={session.user.name ?? "User"}
            email={session.user.email ?? ""}
            role={session.user.role}
            avatar={me?.avatar ?? null}
          />
          <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">{children}</main>
        </div>
      </div>
      <MobileBottomNav role={session.user.role} />
      <PageVisitTracker />
      <UpcomingReminders userId={session.user.id} />
      {(session.user.role === "STUDENT" || session.user.role === "PARENT") && (
        <RatingPrompts role={session.user.role as "STUDENT" | "PARENT"} />
      )}
      {isAdmin ? (
        <>
          <AdminCommandPalette />
          <AdminChatPanel />
        </>
      ) : (
        <HajrChatPanel />
      )}
    </SessionProvider>
  );
}
