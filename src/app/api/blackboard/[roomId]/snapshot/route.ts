import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const lastSavedAt = new Map<string, number>();
const DEBOUNCE_MS = 5_000;

export async function GET(
  _req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const room = await prisma.blackboardRoom.findUnique({
    where: { id: params.roomId },
    include: {
      session: { include: { class: { include: { enrollments: true } } } },
      permissions: { where: { revokedAt: null } },
    },
  });

  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = session.user.id;
  const role = session.user.role;
  const isHost = role === "TEACHER" || role === "SUPER_ADMIN" || role === "ADMIN";

  if (!isHost) {
    const student = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!student) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const isEnrolled = room.session?.class?.enrollments.some(
      (e) => e.studentId === student.id && e.status === "ACTIVE"
    );
    if (!isEnrolled) return NextResponse.json({ error: "Not enrolled" }, { status: 403 });

    const hasPermission = room.permissions.some((p) => p.studentId === student.id);
    return NextResponse.json({
      snapshot: room.snapshotJson,
      allowStudentEdit: room.allowStudentEdit,
      isHost: false,
      hasIndividualPermission: hasPermission,
    });
  }

  return NextResponse.json({
    snapshot: room.snapshotJson,
    allowStudentEdit: room.allowStudentEdit,
    isHost: true,
    hasIndividualPermission: false,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roomId = params.roomId;
  const now = Date.now();
  const lastSave = lastSavedAt.get(roomId) ?? 0;
  if (now - lastSave < DEBOUNCE_MS) {
    return NextResponse.json({ debounced: true }, { status: 202 });
  }

  const room = await prisma.blackboardRoom.findUnique({
    where: { id: roomId },
    include: { permissions: { where: { revokedAt: null } } },
  });
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = session.user.id;
  const role = session.user.role;
  const isHost = role === "TEACHER" || role === "SUPER_ADMIN" || role === "ADMIN";

  if (!isHost) {
    const student = await prisma.studentProfile.findUnique({ where: { userId } });
    const canEdit =
      room.allowStudentEdit ||
      (student && room.permissions.some((p) => p.studentId === student.id));
    if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  lastSavedAt.set(roomId, now);

  await prisma.blackboardRoom.update({
    where: { id: roomId },
    data: {
      snapshotJson: body.snapshot as any,
      lastEditedBy: userId,
      lastEditedAt: new Date(),
      totalEdits: { increment: 1 },
    },
  });

  await logAudit({
    userId,
    action: "BLACKBOARD_SNAPSHOT_SAVED",
    entity: "BlackboardRoom",
    entityId: roomId,
  });

  return NextResponse.json({ saved: true });
}
