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

  // If a class session is supplied, verify the teacher owns that class —
  // the blackboard is gated by the session's class roster, so a teacher
  // must not be able to attach a board to another teacher's class.
  let linkSessionId: string | null = null;
  if (typeof body.sessionId === "string" && body.sessionId) {
    const cs = await prisma.classSession.findUnique({
      where: { id: body.sessionId },
      include: { class: { select: { teacherId: true } } },
    });
    if (!cs) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (cs.class.teacherId !== teacher.id) {
      return NextResponse.json(
        { error: "This is not your class session" },
        { status: 403 }
      );
    }
    linkSessionId = cs.id;
  }

  const room = await prisma.blackboardRoom.create({
    data: {
      name,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      teacherId: teacher.id,
      tldrawRoomId: crypto.randomUUID(),
      isActive: true,
    },
  });

  if (linkSessionId) {
    await prisma.classSession.update({
      where: { id: linkSessionId },
      data: { blackboardRoomId: room.id },
    });
  }

  await logAudit({
    userId: session.user.id,
    action: "BLACKBOARD_ROOM_CREATED",
    entity: "BlackboardRoom",
    entityId: room.id,
    metadata: { name, sessionId: linkSessionId },
  });

  return NextResponse.json({ roomId: room.id });
}
