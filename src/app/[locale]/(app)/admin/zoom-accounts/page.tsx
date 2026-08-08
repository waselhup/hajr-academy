import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { envHostEmail, findUpcomingClashes } from "@/lib/video/host-availability";
import { ZoomAccountsClient } from "./_components/zoom-accounts-client";

export const dynamic = "force-dynamic";

export default async function AdminZoomAccountsPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  let rows: any[] = [];
  let clashes: any[] = [];
  let mainConnection = {
    hostEmail: "",
    configured: false,
    teacherCount: 0,
    teachers: [] as string[],
  };

  try {
    const accounts = await prisma.zoomAccount.findMany({
      include: {
        teachers: { select: { id: true, user: { select: { name: true, nameAr: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });
    // Never send secrets to the client — only whether the account has its own keys.
    rows = accounts.map((a) => ({
      id: a.id,
      label: a.label,
      hostEmail: a.hostEmail,
      capacity: a.capacity,
      maxConcurrent: a.maxConcurrent,
      isActive: a.isActive,
      ownCreds: !!(a.accountId && a.clientId && a.clientSecretEnc),
      teacherCount: a.teachers.length,
      teachers: a.teachers.map((t) => t.user.nameAr ?? t.user.name),
      lastCheckOk: a.lastCheckOk,
      lastCheckedAt: a.lastCheckedAt ? a.lastCheckedAt.toISOString() : null,
    }));

    // Teachers with no account fall back to the shared env host — that host is
    // invisible in the DB, so surface it as a first-class card instead of
    // letting the page claim "nothing is connected" while classes run on it.
    const unassigned = await prisma.teacherProfile.findMany({
      where: { zoomAccountId: null, active: true },
      select: { user: { select: { name: true, nameAr: true } } },
    });
    mainConnection = {
      hostEmail: envHostEmail(),
      configured: !!(
        process.env.ZOOM_ACCOUNT_ID &&
        process.env.ZOOM_CLIENT_ID &&
        process.env.ZOOM_CLIENT_SECRET
      ),
      teacherCount: unassigned.length,
      teachers: unassigned.map((t) => t.user.nameAr ?? t.user.name),
    };

    clashes = (await findUpcomingClashes(30)).slice(0, 25).map((c) => ({
      hostEmail: c.hostEmail,
      accountLabel: c.accountLabel,
      a: { ...c.a, start: c.a.start.toISOString(), end: c.a.end.toISOString() },
      b: { ...c.b, start: c.b.start.toISOString(), end: c.b.end.toISOString() },
    }));
  } catch (e) {
    console.error("[admin-zoom-accounts] DB query failed:", e);
  }

  return (
    <ZoomAccountsClient
      rows={rows}
      mainConnection={mainConnection}
      clashes={clashes}
    />
  );
}
