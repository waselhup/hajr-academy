import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
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

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen bg-brand-ivory">
        <Sidebar role={session.user.role} />
        {/* Persistent re-open affordance — visible on every page/shell when the
            sidebar is collapsed (desktop) or hidden (mobile). See F7. */}
        <SidebarReopenHandle />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            userId={session.user.id}
            name={session.user.name ?? "User"}
            email={session.user.email ?? ""}
            role={session.user.role}
          />
          <main className="flex-1 p-4 pb-24 sm:p-6 sm:pb-6 lg:p-8 lg:pb-8">{children}</main>
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
