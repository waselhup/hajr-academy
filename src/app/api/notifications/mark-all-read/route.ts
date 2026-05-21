import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** POST /api/notifications/mark-all-read — mark all the user's notifications read. */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ ok: true, updated: result.count });
  } catch (e) {
    console.error("[api/notifications/mark-all-read] failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
