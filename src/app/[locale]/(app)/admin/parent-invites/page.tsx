import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminParentInvitesClient } from "./parent-invites-client";

export const dynamic = "force-dynamic";

/**
 * /admin/parent-invites — generate and track parent invite codes.
 */
export default async function AdminParentInvitesPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const t = await getTranslations("ParentPortal");

  let invites: Awaited<ReturnType<typeof loadInvites>> = [];
  let students: { id: string; name: string }[] = [];
  try {
    [invites, students] = await Promise.all([loadInvites(), loadStudents()]);
  } catch (e) {
    console.error("[admin-parent-invites] failed:", e);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("parentInvites")}</h1>
      <AdminParentInvitesClient invites={invites} students={students} />
    </div>
  );
}

async function loadInvites() {
  const rows = await prisma.parentInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      student: { include: { user: { select: { name: true, nameAr: true } } } },
    },
  });
  const now = new Date();
  return rows.map((inv) => ({
    id: inv.id,
    inviteCode: inv.inviteCode,
    studentName: inv.student.user.name,
    status:
      inv.status === "PENDING" && inv.expiresAt < now
        ? "EXPIRED"
        : inv.status,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  }));
}

async function loadStudents() {
  const rows = await prisma.studentProfile.findMany({
    take: 500,
    include: { user: { select: { name: true, nameAr: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((s) => ({
    id: s.id,
    name: s.user.nameAr ? `${s.user.name} (${s.user.nameAr})` : s.user.name,
  }));
}
