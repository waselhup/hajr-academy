import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = 50;
  const skip = (page - 1) * limit;
  const status = url.searchParams.get("status");
  const teacherId = url.searchParams.get("teacherId");

  const where: Record<string, unknown> = {};
  if (status === "active") where.isActive = true;
  if (status === "archived") where.archivedAt = { not: null };
  if (teacherId) where.teacherId = teacherId;

  const [rooms, total] = await Promise.all([
    prisma.blackboardRoom.findMany({
      where,
      include: {
        teacher: { include: { user: { select: { name: true, email: true } } } },
        session: { include: { class: { select: { name: true, id: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.blackboardRoom.count({ where }),
  ]);

  return NextResponse.json({
    rooms: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      teacherName: r.teacher.user.name,
      teacherEmail: r.teacher.user.email,
      className: r.session?.class?.name ?? null,
      classId: r.session?.class?.id ?? null,
      isActive: r.isActive,
      archivedAt: r.archivedAt,
      totalEdits: r.totalEdits,
      lastEditedAt: r.lastEditedAt,
      createdAt: r.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
