import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

/**
 * A readable one-time password: an uppercase prefix + digits, e.g. "HAJR-7K3M92".
 * Generated only at approval time and shown ONCE to the approving admin so they
 * can hand it to the partner manually. We never store the plaintext.
 */
function makeTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `Hajr-${s}`;
}

export async function POST(req: NextRequest) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const body = await req.json();
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");

  if (!id || !action) return NextResponse.json({ error: "Missing id or action" }, { status: 400 });

  const m = await prisma.marketerProfile.findUnique({ where: { id }, include: { user: true } });
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "APPROVE") {
    // Generate a fresh temporary password at approval time, store its hash, and
    // return it ONCE to the approving admin to deliver manually (WhatsApp/email).
    // The system never sends it automatically and never persists the plaintext.
    const tempPassword = makeTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.$transaction([
      prisma.marketerProfile.update({ where: { id }, data: { status: "ACTIVE" } }),
      prisma.user.update({
        where: { id: m.userId },
        data: { isActive: true, passwordHash },
      }),
    ]);
    await audit.mutation(session.user.id, "MARKETER_APPROVED", "MarketerProfile", id, {
      email: m.user.email,
      credentialsIssued: true, // never log the password itself
    });
    await notify({
      userId: m.userId,
      type: "MARKETER_UPDATE",
      title: "Marketer account approved",
      titleAr: "تم اعتماد حسابك كمسوّق",
      body: "Your marketer account is now active. You can log in and start sharing your code.",
      bodyAr: "تم تفعيل حسابك كمسوّق. تستطيع تسجيل الدخول والبدء بمشاركة كودك.",
      channels: ["inApp", "email"],
      actionUrl: "/marketer",
      actionLabel: "Open dashboard",
      actionLabelAr: "افتح اللوحة",
      priority: "HIGH",
      refType: "MarketerProfile",
      refId: id,
    });
    // Credentials returned to the admin UI only — shown in a one-time panel.
    return NextResponse.json({
      ok: true,
      credentials: { username: m.user.email, tempPassword },
    });
  }

  if (action === "SUSPEND") {
    await prisma.marketerProfile.update({ where: { id }, data: { status: "SUSPENDED" } });
    await audit.mutation(session.user.id, "MARKETER_SUSPENDED", "MarketerProfile", id, {});
    await notify({
      userId: m.userId,
      type: "MARKETER_UPDATE",
      title: "Marketer account suspended",
      titleAr: "تم إيقاف حسابك كمسوّق",
      body: "Please contact admin for clarification.",
      bodyAr: "يرجى التواصل مع الإدارة.",
      channels: ["inApp", "email"],
      priority: "HIGH",
      refType: "MarketerProfile",
      refId: id,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "ACTIVATE") {
    await prisma.marketerProfile.update({ where: { id }, data: { status: "ACTIVE" } });
    await audit.mutation(session.user.id, "MARKETER_ACTIVATED", "MarketerProfile", id, {});
    return NextResponse.json({ ok: true });
  }

  if (action === "SET_RATE") {
    const rate = Number(body.rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      return NextResponse.json({ error: "Invalid rate" }, { status: 400 });
    }
    await prisma.marketerProfile.update({ where: { id }, data: { commissionRate: rate } });
    await audit.mutation(session.user.id, "MARKETER_RATE_UPDATED", "MarketerProfile", id, { rate });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
