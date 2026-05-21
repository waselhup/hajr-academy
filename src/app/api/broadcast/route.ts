import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dispatch } from "@/lib/comms/dispatcher";
import type { CommChannel } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/broadcast — send a broadcast to a role or a class.
 *
 * Admin / Super Admin: may broadcast to any role or class.
 * Teacher: may broadcast only to classes they teach.
 *
 * Body: { target: "role"|"class", roleValue?, classId?, subject, body,
 *         channels: CommChannel[] }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (!["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const target = String(body.target ?? "");
    const subject = String(body.subject ?? "").trim();
    const text = String(body.body ?? "").trim();
    const channels: CommChannel[] = Array.isArray(body.channels)
      ? body.channels.filter((c: string) =>
          ["EMAIL", "SMS", "WHATSAPP", "IN_APP"].includes(c)
        )
      : ["IN_APP"];

    if (!text) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }

    if (target === "class") {
      const classId = String(body.classId ?? "");
      if (!classId) {
        return NextResponse.json({ error: "classId required" }, { status: 400 });
      }
      // Teachers may only broadcast to their own classes.
      if (role === "TEACHER") {
        const teacher = await prisma.teacherProfile.findUnique({
          where: { userId: session.user.id },
          select: { id: true },
        });
        const cls = await prisma.class.findUnique({
          where: { id: classId },
          select: { teacherId: true },
        });
        if (!teacher || !cls || cls.teacherId !== teacher.id) {
          return NextResponse.json(
            { error: "Not your class" },
            { status: 403 }
          );
        }
      }
      const result = await dispatch({
        toClassId: classId,
        trigger: "MANUAL",
        subject,
        bodyEn: text,
        bodyAr: text,
        channels,
        priority: "NORMAL",
        notificationType: "SYSTEM_ANNOUNCEMENT",
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (target === "role") {
      // Only admins may broadcast by role.
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Only admins can broadcast by role" },
          { status: 403 }
        );
      }
      const roleValue = String(body.roleValue ?? "");
      if (!["STUDENT", "TEACHER", "PARENT"].includes(roleValue)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      const result = await dispatch({
        toRole: roleValue as "STUDENT" | "TEACHER" | "PARENT",
        trigger: "MANUAL",
        subject,
        bodyEn: text,
        bodyAr: text,
        channels,
        priority: "NORMAL",
        notificationType: "SYSTEM_ANNOUNCEMENT",
      });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  } catch (e) {
    console.error("[api/broadcast] failed:", e);
    return NextResponse.json({ error: "Broadcast failed" }, { status: 500 });
  }
}
