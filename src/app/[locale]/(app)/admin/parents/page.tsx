import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ParentsTabs } from "./_components/parents-tabs";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function AdminParentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    childCount?: string;
    tab?: string;
  }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const q = (sp.q ?? "").trim();
  const initialTab = sp.tab === "invites" ? "invites" : "parents";

  const where: any = { role: "PARENT" };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }

  let total = 0;
  let parents: any[] = [];
  let allStudents: any[] = [];
  let invites: any[] = [];
  let inviteStudents: { id: string; name: string }[] = [];

  try {
    const [_total, rows, _allStudents, _invites, _inviteStudents] =
      await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          include: {
            parentProfile: {
              include: {
                childLinks: {
                  include: {
                    student: {
                      include: {
                        user: { select: { name: true, nameAr: true } },
                      },
                    },
                  },
                },
                _count: { select: { childLinks: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        prisma.studentProfile.findMany({
          include: { user: { select: { name: true, nameAr: true } } },
          take: 200,
        }),
        prisma.parentInvite.findMany({
          orderBy: { createdAt: "desc" },
          take: 200,
          include: {
            student: {
              include: { user: { select: { name: true, nameAr: true } } },
            },
          },
        }),
        prisma.studentProfile.findMany({
          take: 500,
          include: { user: { select: { name: true, nameAr: true } } },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    total = _total;
    allStudents = _allStudents;

    parents = rows.map((u) => ({
      id: u.id,
      name: u.name,
      nameAr: u.nameAr,
      email: u.email,
      phone: u.phone,
      isActive: u.isActive,
      profile: u.parentProfile
        ? {
            id: u.parentProfile.id,
            occupation: u.parentProfile.occupation,
            inviteCode: u.parentProfile.inviteCode,
            childCount: u.parentProfile._count.childLinks,
            childLinks: u.parentProfile.childLinks.map((l) => ({
              id: l.id,
              studentId: l.studentId,
              studentName: l.student.user.name,
              studentNameAr: l.student.user.nameAr,
              relation: l.relation,
              isPrimary: l.isPrimary,
              canPay: l.canPay,
            })),
          }
        : null,
    }));

    const now = new Date();
    invites = _invites.map((inv) => ({
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

    inviteStudents = _inviteStudents.map((s) => ({
      id: s.id,
      name: s.user.nameAr ? `${s.user.name} (${s.user.nameAr})` : s.user.name,
    }));
  } catch (e) {
    console.error("[admin-parents] DB query failed:", e);
  }

  return (
    <ParentsTabs
      initialTab={initialTab}
      parents={parents}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      students={allStudents.map((s) => ({
        id: s.id,
        name: s.user.name,
        nameAr: s.user.nameAr,
      }))}
      invites={invites}
      inviteStudents={inviteStudents}
    />
  );
}
