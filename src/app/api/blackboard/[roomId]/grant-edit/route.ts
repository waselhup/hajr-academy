import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const room = await prisma.blackboardRoom.findUnique({ where: { id: params.roomId } });
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role === "TEACHER") {
    const teacher = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
    if (!teacher || room.teacherId !== teacher.id) {
      return NextResponse.json({ error: "Not your room" }, { status: 403 });
    }
  }

  const { studentId } = await req.json();
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  await prisma.blackboardPermission.upsert({
    where: { roomId_studentId: { roomId: params.roomId, studentId } },
    create: {
      roomId: params.roomId,
      studentId,
      grantedBy: session.user.id,
    },
    update: {
      revokedAt: null,
      grantedBy: session.user.id,
      grantedAt: new Date(),
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "BLACKBOARD_PERMISSION_GRANTED",
    entity: "BlackboardPermission",
    entityId: params.roomId,
    metadata: { studentId },
  });

  return NextResponse.json({ granted: true });
}
