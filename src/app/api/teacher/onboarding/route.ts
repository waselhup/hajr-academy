/**
 * Owner batch 5, item #5 — Teacher onboarding gate.
 *
 * POST /api/teacher/onboarding
 *   Server-enforced, idempotent completion of the first-login teacher
 *   onboarding questionnaire. Reuses the TeacherReadiness fields as the
 *   question set and flips TeacherProfile.onboardingCompletedAt so the
 *   /teacher layout guard stops redirecting to /teacher/onboarding.
 *
 * Validation is re-done here — the client is never trusted: the four
 * acknowledgement booleans must be true, at least one interactive tool
 * (recognized key OR free-text "other") must be named, and selfRating
 * must be an integer 1..5.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { KNOWN_TOOLS } from "@/lib/teacher/readiness-tools";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tp = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, onboardingCompletedAt: true },
  });
  if (!tp) {
    return NextResponse.json({ error: "No profile" }, { status: 404 });
  }

  // Idempotent: already onboarded → no-op success (handles double-submit and
  // any client that posts after the redirect has already happened).
  if (tp.onboardingCompletedAt) {
    return NextResponse.json({ ok: true, alreadyDone: true });
  }

  let body: {
    zoomTested?: unknown;
    digitalToolsOk?: unknown;
    mockClassDone?: unknown;
    classroomMgmt?: unknown;
    interactiveTools?: unknown;
    interactiveToolsOther?: unknown;
    selfRating?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // --- Server-side validation (never trust the client) ---------------------
  // The four acknowledgements are required and must be explicitly true.
  if (
    body.zoomTested !== true ||
    body.digitalToolsOk !== true ||
    body.mockClassDone !== true ||
    body.classroomMgmt !== true
  ) {
    return NextResponse.json(
      { error: "All readiness confirmations are required" },
      { status: 400 }
    );
  }

  // Interactive tools: keep only recognized keys; cap free-text "other".
  const interactiveToolsList = Array.isArray(body.interactiveTools)
    ? [
        ...new Set(
          body.interactiveTools.filter(
            (x): x is string =>
              typeof x === "string" &&
              (KNOWN_TOOLS as readonly string[]).includes(x)
          )
        ),
      ]
    : [];
  const interactiveToolsOther =
    typeof body.interactiveToolsOther === "string" &&
    body.interactiveToolsOther.trim()
      ? body.interactiveToolsOther.trim().slice(0, 200)
      : null;

  if (interactiveToolsList.length === 0 && interactiveToolsOther === null) {
    return NextResponse.json(
      { error: "At least one interactive tool is required" },
      { status: 400 }
    );
  }

  // Self-rating must be an integer 1..5 (Western digits enforced client-side).
  const selfRating = body.selfRating;
  if (
    typeof selfRating !== "number" ||
    !Number.isInteger(selfRating) ||
    selfRating < 1 ||
    selfRating > 5
  ) {
    return NextResponse.json(
      { error: "A self-rating of 1..5 is required" },
      { status: 400 }
    );
  }

  const readinessData = {
    zoomTested: true,
    digitalToolsOk: true,
    mockClassDone: true,
    // "interactive" is satisfied once at least one tool is named.
    interactiveOk: interactiveToolsList.length > 0 || interactiveToolsOther !== null,
    interactiveToolsList,
    interactiveToolsOther,
    classroomMgmt: true,
    selfRating,
  };

  const completedAt = new Date();

  // Upsert readiness AND stamp the onboarding gate in one transaction so a
  // half-written state can never leave the teacher locked out (or let in
  // without an answer row).
  await prisma.$transaction([
    prisma.teacherReadiness.upsert({
      where: { teacherId: tp.id },
      create: { ...readinessData, teacherId: tp.id },
      update: readinessData,
    }),
    prisma.teacherProfile.update({
      where: { id: tp.id },
      data: { onboardingCompletedAt: completedAt },
    }),
  ]);

  await audit.mutation(
    session.user.id,
    "TEACHER_ONBOARDING_COMPLETED",
    "TeacherProfile",
    tp.id,
    { onboardingCompletedAt: completedAt.toISOString() }
  );

  return NextResponse.json({ ok: true });
}
