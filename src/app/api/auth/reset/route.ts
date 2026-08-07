import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Completes a password reset. Validates the single-use token (matched by its
// SHA-256 hash), sets the new bcrypt password hash (cost 12, matching register),
// and burns the token. Generic errors only — no detail that aids probing.
const schema = z.object({
  token: z.string().min(32),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const { token, password } = parsed.data;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        purpose: true,
      },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json(
        { ok: false, error: "TOKEN_INVALID_OR_EXPIRED" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Burn the token FIRST, conditionally. The raw link legitimately reaches
    // more than one party (the emailed copy and the admin's WhatsApp copy),
    // so two people really can submit it at once; a check-then-write would
    // let both set a password and the second would silently win.
    const burn = await prisma.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (burn.count === 0) {
      return NextResponse.json(
        { ok: false, error: "TOKEN_INVALID_OR_EXPIRED" },
        { status: 400 }
      );
    }

    // Following a SETUP link proves control of the mailbox it was sent to,
    // which is what verifying an address means — so an account activated
    // this way starts out verified.
    await prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        ...(record.purpose === "SETUP" ? { emailVerified: true } : {}),
      },
    });

    // The stored copy of this link is now spent — clear it so a used token
    // stops being readable from the admin pages and from any DB backup.
    if (record.purpose === "SETUP") {
      await prisma.purchaseOrder
        .updateMany({
          where: { provisionedStudentId: record.userId },
          data: { setupUrl: null },
        })
        .catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[auth/reset] error:", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
