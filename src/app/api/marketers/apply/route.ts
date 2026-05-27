import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notify";
import { audit } from "@/lib/audit";
import { generateUniqueReferralCode } from "@/lib/marketer/codes";
import { sendEmail } from "@/lib/comms/email";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9 \-]{7,20}$/;

function makeTempPassword(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const why = String(body.why ?? "").trim();
    const social = String(body.social ?? "").trim();

    if (!name || !email || !phone || !why) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (!PHONE_RE.test(phone)) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }
    if (name.length > 120 || why.length > 2000 || social.length > 500) {
      return NextResponse.json({ error: "Field too long" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const tempPassword = makeTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const referralCode = await generateUniqueReferralCode();

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          phone,
          role: "MARKETER",
          isActive: false, // activated on admin approval
        },
      });
      const profile = await tx.marketerProfile.create({
        data: {
          userId: user.id,
          referralCode,
          status: "PENDING",
          notes: `Application: ${why}\nSocial: ${social || "—"}`,
        },
      });
      return { user, profile };
    });

    await audit.mutation(result.user.id, "MARKETER_APPLIED", "MarketerProfile", result.profile.id, {
      email,
      referralCode,
    });

    await notifyAdmins({
      type: "SYSTEM_ANNOUNCEMENT",
      title: "New marketer application",
      titleAr: "طلب مسوّق جديد",
      body: `${name} (${email}) has applied to become a marketer.`,
      bodyAr: `${name} (${email}) قدّم طلباً ليكون مسوّقاً.`,
      channels: ["inApp", "email"],
      actionUrl: `/admin/marketers/${result.profile.id}`,
      actionLabel: "Review",
      actionLabelAr: "مراجعة",
      priority: "NORMAL",
      refType: "MarketerProfile",
      refId: result.profile.id,
    });

    // Welcome email (best-effort)
    await sendEmail({
      to: email,
      subject: "Hajr Academy — Marketer application received / طلب مسوّق تم استلامه",
      html: `<p>Hello ${name},</p><p>We received your marketer application. Our team will review it within 48 hours.</p><p>مرحباً ${name}، تم استلام طلبك للانضمام كمسوّق. سنراجعه خلال ٤٨ ساعة.</p>`,
      text: `Hello ${name}, we received your marketer application.`,
    }).catch(() => {});

    return NextResponse.json({ ok: true, applicationId: result.profile.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
