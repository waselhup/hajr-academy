import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ZoomAccountsClient } from "./_components/zoom-accounts-client";

export const dynamic = "force-dynamic";

export default async function AdminZoomAccountsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  let rows: any[] = [];
  let envConfigured = false;

  try {
    const accounts = await prisma.zoomAccount.findMany({
      include: { _count: { select: { teachers: true } } },
      orderBy: { createdAt: "asc" },
    });
    // Never send secrets to the client — only whether the account has its own keys.
    rows = accounts.map((a) => ({
      id: a.id,
      label: a.label,
      hostEmail: a.hostEmail,
      capacity: a.capacity,
      isActive: a.isActive,
      ownCreds: !!(a.accountId && a.clientId && a.clientSecretEnc),
      teacherCount: a._count.teachers,
      lastCheckOk: a.lastCheckOk,
      lastCheckedAt: a.lastCheckedAt ? a.lastCheckedAt.toISOString() : null,
    }));
    envConfigured = !!(
      process.env.ZOOM_ACCOUNT_ID &&
      process.env.ZOOM_CLIENT_ID &&
      process.env.ZOOM_CLIENT_SECRET
    );
  } catch (e) {
    console.error("[admin-zoom-accounts] DB query failed:", e);
  }

  return <ZoomAccountsClient rows={rows} envConfigured={envConfigured} />;
}
