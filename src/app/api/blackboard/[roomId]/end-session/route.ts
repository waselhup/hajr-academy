import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(
  _req: NextRequest,
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

  await prisma.blackboardRoom.update({
    where: { id: params.roomId },
    data: {
      archivedAt: new Date(),
      isActive: false,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "BLACKBOARD_SESSION_ENDED",
    entity: "BlackboardRoom",
    entityId: params.roomId,
  });

  return NextResponse.json({ archived: true });
}
