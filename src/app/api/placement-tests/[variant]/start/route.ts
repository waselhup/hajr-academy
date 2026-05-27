import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notify";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VARIANTS = ["GENERAL_ENGLISH", "STEP_PREP", "IELTS_PREP"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ variant: string }> }
) {
  const { variant } = await params;
  const upper = variant.toUpperCase() as (typeof VARIANTS)[number];
  if (!VARIANTS.includes(upper)) {
    return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const guestName = body.guestName ? String(body.guestName).trim() : null;
  const guestEmail = body.guestEmail ? String(body.guestEmail).trim().toLowerCase() : null;
  const guestPhone = body.guestPhone ? String(body.guestPhone).trim() : null;
  const sourceUtm = body.sourceUtm ? String(body.sourceUtm).slice(0, 200) : null;

  const session = await auth();
  let studentId: string | null = null;

  if (session?.user) {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    studentId = student?.id ?? null;
  }

  if (!studentId) {
    if (!guestName || !guestEmail) {
      return NextResponse.json({ error: "Name and email required for guests" }, { status: 400 });
    }
    if (!EMAIL_RE.test(guestEmail)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
  }

  const test = await prisma.placementTest.findFirst({
    where: { variant: upper, isActive: true },
    select: { id: true },
  });
  if (!test) return NextResponse.json({ error: "No active test for variant" }, { status: 404 });

  const sessionId = randomUUID();
  const attempt = await prisma.placementAttempt.create({
    data: {
      testId: test.id,
      studentId,
      guestName,
      guestEmail,
      guestPhone,
      sessionId,
      sourceUtm,
      answers: {},
      status: "IN_PROGRESS",
    },
  });

  await audit.mutation(session?.user.id ?? null, "PLACEMENT_STARTED", "PlacementAttempt", attempt.id, {
    variant: upper,
    isGuest: !studentId,
  });

  await notifyAdmins({
    type: "SYSTEM_ANNOUNCEMENT",
    title: "Placement test started",
    titleAr: "بدأ اختبار تحديد المستوى",
    body: `${guestName || session?.user.name || "A user"} started a ${upper} placement test.`,
    bodyAr: `${guestName || session?.user.name || "مستخدم"} بدأ اختبار تحديد مستوى ${upper}.`,
    channels: ["inApp"],
    actionUrl: `/admin/placement-tests/${attempt.id}`,
    actionLabel: "View",
    actionLabelAr: "عرض",
    priority: "LOW",
    refType: "PlacementAttempt",
    refId: attempt.id,
  });

  return NextResponse.json({ attemptId: attempt.id, sessionId });
}
