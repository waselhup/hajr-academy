import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!teacher) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const room = await prisma.blackboardRoom.create({
    data: {
      name,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      teacherId: teacher.id,
      tldrawRoomId: crypto.randomUUID(),
      isActive: true,
    },
  });

  if (body.sessionId) {
    await prisma.classSession.update({
      where: { id: body.sessionId },
      data: { blackboardRoomId: room.id },
    }).catch(() => {});
  }

  await logAudit({
    userId: session.user.id,
    action: "BLACKBOARD_ROOM_CREATED",
    entity: "BlackboardRoom",
    entityId: room.id,
    metadata: { name, sessionId: body.sessionId ?? null },
  });

  return NextResponse.json({ roomId: room.id });
}
