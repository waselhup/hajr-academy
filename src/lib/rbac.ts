import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { ROLE_HOME } from "@/lib/role-home";

// Re-exported for backward compatibility; canonical definition lives in
// `@/lib/role-home` (server-free) so client components can use it too.
export { ROLE_HOME };

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    // Preserve the active locale on the auth bounce (was hardcoded /ar/login).
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }
  return session;
}

export async function requireRole(...roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    redirect(ROLE_HOME[session.user.role]);
  }
  return session;
}

export function isAdminish(role: Role) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}
