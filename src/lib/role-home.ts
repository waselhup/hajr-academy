import type { Role } from "@prisma/client";

/**
 * Canonical post-login / fallback home route per role.
 * Kept in its own module (no server-only imports) so it can be safely used
 * from both server code (`rbac.ts`) and client components (e.g. the login form)
 * without dragging the auth/prisma graph into the client bundle.
 */
export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: "/admin",
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
  MARKETER: "/marketer",
};
