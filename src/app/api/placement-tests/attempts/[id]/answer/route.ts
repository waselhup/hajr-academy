import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const sessionId: string | undefined = body.sessionId;
  const answers = body.answers ?? {};
  if (typeof answers !== "object" || Array.isArray(answers)) {
    return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
  }

  const attempt = await prisma.placementAttempt.findUnique({
    where: { id },
    select: { id: true, studentId: true, sessionId: true, status: true },
  });
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Attempt is not in progress" }, { status: 400 });
  }

  const session = await auth();
  const ownerByStudent =
    !!session?.user &&
    (await prisma.studentProfile.findFirst({
      where: { id: attempt.studentId ?? "__none__", userId: session.user.id },
      select: { id: true },
    }));
  const ownerBySession = sessionId && attempt.sessionId === sessionId;
  if (!ownerByStudent && !ownerBySession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.placementAttempt.update({
    where: { id },
    data: { answers },
  });
  return NextResponse.json({ ok: true });
}
