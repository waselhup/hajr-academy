/**
 * Who may see the marketing traffic dashboard.
 *
 * Deliberately NOT a role check. Every admin can already see students and
 * classes; ad spend, campaign performance and cost-per-customer are a narrower
 * circle, and the owner asked for it to be his account only. A per-user flag
 * gives exactly that without inventing a role that would strip its holder of
 * the rest of the dashboard — the same reasoning as `isFinanceApprover`.
 *
 * The flag is read from the database on every request rather than from the
 * session token, because a JWT keeps whatever was stamped at sign-in: revoking
 * access would otherwise not take effect until the person happened to log out.
 */
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/rbac";
import { ROLE_HOME } from "@/lib/role-home";
import { prisma } from "@/lib/prisma";

export interface TrafficViewer {
  userId: string;
  name: string | null;
  role: string;
}

/**
 * Server-side guard for the traffic pages.
 *
 * Must be called ABOVE any try/catch: it works by throwing NEXT_REDIRECT, and
 * a surrounding catch would swallow the redirect and turn a denied request
 * into a 500 that leaks the page.
 */
export async function requireTrafficAccess(): Promise<TrafficViewer> {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true, canViewTraffic: true, isActive: true },
  });

  // Sent to their own home rather than shown a "denied" page: an admin who
  // stumbles onto this URL does not need to learn the dashboard exists.
  if (!user?.isActive || !user.canViewTraffic) {
    redirect(ROLE_HOME[session.user.role]);
  }

  return { userId: user.id, name: user.name, role: user.role };
}

/** Same rule for API routes, which answer with a status instead of redirecting. */
export async function hasTrafficAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { canViewTraffic: true, isActive: true },
  });
  return Boolean(user?.isActive && user.canViewTraffic);
}
