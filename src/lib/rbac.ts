import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: "/admin",
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
};

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/ar/login");
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
