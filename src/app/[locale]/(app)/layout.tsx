import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { SessionProvider } from "@/components/providers/session-provider";
import AdminCommandPalette from "@/components/admin/AdminCommandPalette";
import AdminChatPanel from "@/components/admin/AdminChatPanel";
import HajrChatPanel from "@/components/shared/HajrChatPanel";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/ar/login");

  const isAdmin =
    session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen bg-brand-ivory">
        <Sidebar role={session.user.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            name={session.user.name ?? "User"}
            email={session.user.email ?? ""}
            role={session.user.role}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
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
