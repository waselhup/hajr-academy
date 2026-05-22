import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVideoProvider } from "@/lib/video";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  meetingNumber: z.string().min(3),
  role: z.enum(["host", "attendee"]),
  userName: z.string().min(1).max(80),
});

/**
 * Issues a Zoom Web SDK signature for the requesting user.
 *
 * Authorization:
 *  - host     → caller must be ADMIN/SUPER_ADMIN, or the TEACHER who owns the
 *               class/private-lesson tied to this meeting number.
 *  - attendee → caller must be a STUDENT enrolled in the class (or the booked
 *               private-lesson student), or a PARENT of an enrolled minor.
 *
 * Rate limited to 10 requests / minute / user.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const rl = rateLimit(`zoom-sig:${session.user.id}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "INVALID_INPUT", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { meetingNumber, role, userName } = parsed.data;

  // Resolve the meeting to either a ClassSession or a PrivateLesson.
  const classSession = await prisma.classSession.findFirst({
    where: { zoomMeetingId: meetingNumber },
    include: { class: { include: { teacher: true, enrollments: true } } },
  });
  const privateLesson = classSession
    ? null
    : await prisma.privateLesson.findFirst({ where: { zoomMeetingId: meetingNumber } });

  if (!classSession && !privateLesson) {
    return NextResponse.json({ ok: false, error: "MEETING_NOT_FOUND" }, { status: 404 });
  }

  const userId = session.user.id;
  const userRole = session.user.role;
  let allowed = false;

  if (role === "host") {
    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
      allowed = true;
    } else if (userRole === "TEACHER") {
      const tp = await prisma.teacherProfile.findUnique({ where: { userId } });
      if (tp) {
        allowed = classSession
          ? classSession.class.teacherId === tp.id
          : privateLesson!.teacherId === tp.id;
      }
    }
  } else {
    // attendee
    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
      allowed = true;
    } else if (userRole === "STUDENT") {
      const sp = await prisma.studentProfile.findUnique({ where: { userId } });
      if (sp) {
        allowed = classSession
          ? classSession.class.enrollments.some(
              (e) => e.studentId === sp.id && e.status === "ACTIVE"
            )
          : privateLesson!.studentId === sp.id;
      }
    } else if (userRole === "PARENT") {
      const pp = await prisma.parentProfile.findUnique({
        where: { userId },
        include: { childLinks: true },
      });
      if (pp) {
        const childIds = pp.childLinks.map((l) => l.studentId);
        if (classSession) {
          allowed = classSession.class.enrollments.some(
            (e) => childIds.includes(e.studentId) && e.status === "ACTIVE"
          );
        } else if (privateLesson) {
          allowed = childIds.includes(privateLesson.studentId);
        }
      }
    }
  }

  if (!allowed) {
    return NextResponse.json({ ok: false, error: "NOT_AUTHORIZED_FOR_MEETING" }, { status: 403 });
  }

  try {
    const provider = getVideoProvider();
    const { signature, sdkKey } = await provider.generateJoinSignature({
      meetingNumber,
      role,
      userName,
    });
    // Debug logging — confirms which SDK Key signed the token and for which
    // meeting/role. Never logs the secret or the full signature.
    console.log("[zoom/signature] issued", {
      sdkKeyPrefix: sdkKey ? sdkKey.slice(0, 6) : "MISSING",
      meetingNumber,
      role,
      userId,
    });
    return NextResponse.json({
      ok: true,
      signature,
      sdkKey,
      meetingNumber,
      role,
      userName,
    });
  } catch (e) {
    console.error("[zoom/signature]", e);
    return NextResponse.json({ ok: false, error: "SIGNATURE_ERROR" }, { status: 500 });
  }
}
