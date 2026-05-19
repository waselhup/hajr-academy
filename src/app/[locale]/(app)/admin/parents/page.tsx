import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ParentsClient } from "./_components/parents-client";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function AdminParentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; childCount?: string }>;
}) {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const q = (sp.q ?? "").trim();

  const where: any = { role: "PARENT" };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }

  const [total, rows, allStudents] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        parentProfile: {
          include: {
            childLinks: { include: { student: { include: { user: { select: { name: true, nameAr: true } } } } } },
            _count: { select: { childLinks: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.studentProfile.findMany({ include: { user: { select: { name: true, nameAr: true } } }, take: 200 }),
  ]);

  const data = rows.map((u) => ({
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

  return (
    <ParentsClient
      rows={data}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      students={allStudents.map((s) => ({ id: s.id, name: s.user.name, nameAr: s.user.nameAr }))}
    />
  );
}
