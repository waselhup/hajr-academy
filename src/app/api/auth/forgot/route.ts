import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/comms/email";

// Always returns the same success payload to prevent email enumeration: a
// caller can never tell whether an address is registered. When the email IS
// registered we issue a single-use, 1-hour reset token and email the link.
// Only the SHA-256 hash of the token is stored; the raw token is in the link.
const schema = z.object({ email: z.string().email() });

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "https://hajr-academy.vercel.app"
  ).replace(/\/$/, "");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: true });

  const email = parsed.data.email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, nameAr: true },
    });

    if (user) {
      // Invalidate any still-pending tokens for this user, then mint a fresh one.
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });

      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      const link = `${baseUrl()}/ar/reset-password?token=${rawToken}`;
      const linkEn = `${baseUrl()}/en/reset-password?token=${rawToken}`;
      await sendEmail({
        to: email,
        subject: "إعادة تعيين كلمة المرور — Reset your password · Hajr Academy",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6">
            <p>مرحباً ${user.nameAr || user.name || ""}،</p>
            <p>لإعادة تعيين كلمة المرور الخاصة بك، اضغط على الرابط التالي (صالح لمدة ساعة واحدة):</p>
            <p><a href="${link}">${link}</a></p>
            <hr/>
            <p>Hello ${user.name || ""},</p>
            <p>To reset your password, click the link below (valid for 1 hour):</p>
            <p><a href="${linkEn}">${linkEn}</a></p>
            <p style="color:#888;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
          </div>`,
      }).catch((e) => console.error("[auth/forgot] email failed (non-fatal):", e));
    }
  } catch (e) {
    // Never surface internal errors to the caller (avoid enumeration / probing).
    console.error("[auth/forgot] error:", e);
  }

  return NextResponse.json({ ok: true });
}
