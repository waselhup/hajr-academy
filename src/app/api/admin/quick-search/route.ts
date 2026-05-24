import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/quick-search?q=...
 * Returns top 5 of each: students, teachers, classes.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ students: [], teachers: [], classes: [] });
  }

  const [students, teachers, classes] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "STUDENT",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { nameAr: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        email: true,
        studentProfile: { select: { id: true, gradeLevel: true } },
      },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        role: "TEACHER",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { nameAr: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        email: true,
        teacherProfile: { select: { id: true, specializations: true } },
      },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { nameAr: { contains: q, mode: "insensitive" } },
          { cohortCode: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        cohortCode: true,
        status: true,
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    students: students.map((s) => ({
      id: s.id,
      name: s.nameAr ?? s.name,
      subtext: s.studentProfile?.gradeLevel ?? s.email,
      href: `/admin/students?q=${encodeURIComponent(s.name)}`,
    })),
    teachers: teachers.map((t) => ({
      id: t.id,
      name: t.nameAr ?? t.name,
      subtext:
        (t.teacherProfile?.specializations ?? []).join(", ") || t.email,
      href: `/admin/teachers?q=${encodeURIComponent(t.name)}`,
    })),
    classes: classes.map((c) => ({
      id: c.id,
      name: c.nameAr ?? c.name,
      subtext: c.cohortCode,
      href: `/admin/classes`,
    })),
  });
}
