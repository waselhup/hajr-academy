import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** PATCH /api/notifications/[id]/read — mark one notification read. */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const notif = await prisma.notification.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });
    if (!notif) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (notif.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.notification.update({
      where: { id: params.id },
      data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/notifications/[id]/read] failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
