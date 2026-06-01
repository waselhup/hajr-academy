import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeSaudiPhone } from "@/lib/utils";
import { notifyAdmins } from "@/lib/notify";
import { audit } from "@/lib/audit";
import {
  DEFAULT_FEATURES,
  ALL_FEATURES,
  deliverAdminMessageToApplicant,
} from "@/lib/applicants/service";

export const dynamic = "force-dynamic";

/**
 * POST /api/applicants/register — public signup for a NEW prospective teacher
 * (an APPLICANT). Creates User(role=APPLICANT) + ApplicantProfile(stage=NEW) +
 * the six ApplicantFeatureAccess rows (Overview/Openings/Messaging enabled,
 * rest off), drops a warm welcome message into their inbox so the Overview is
 * never empty, then notifies every admin. Login then flows through the normal
 * NextAuth credentials provider; the applicant lands on /applicant.
 */
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  nameAr: z.string().optional(),
  phone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  appliedProgramId: z.string().optional(),
  preferredLang: z.enum(["AR", "EN"]).default("AR"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name, nameAr, phone, gender, appliedProgramId, preferredLang } =
      parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const normalizedPhone = phone ? normalizeSaudiPhone(phone) : null;
    if (phone && !normalizedPhone) {
      return NextResponse.json({ error: "Invalid Saudi phone" }, { status: 400 });
    }

    // Only accept an appliedProgramId that is a real, active program.
    let resolvedProgramId: string | null = null;
    if (appliedProgramId) {
      const program = await prisma.program.findFirst({
        where: { id: appliedProgramId, active: true },
        select: { id: true },
      });
      resolvedProgramId = program?.id ?? null;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create user + applicant profile + all feature rows atomically.
    const { user, applicant } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name,
          nameAr,
          phone: normalizedPhone,
          role: "APPLICANT",
          preferredLang,
        },
        select: { id: true, name: true },
      });

      const applicant = await tx.applicantProfile.create({
        data: {
          userId: user.id,
          fullName: name,
          phone: normalizedPhone,
          gender: gender ?? null,
          appliedProgramId: resolvedProgramId,
          stage: "NEW",
        },
        select: { id: true },
      });

      await tx.applicantFeatureAccess.createMany({
        data: ALL_FEATURES.map((feature) => ({
          applicantId: applicant.id,
          feature,
          enabled: DEFAULT_FEATURES.includes(feature),
          enabledAt: DEFAULT_FEATURES.includes(feature) ? new Date() : null,
        })),
        skipDuplicates: true,
      });

      return { user, applicant };
    });

    await audit.mutation(user.id, "USER_REGISTERED", "User", user.id, {
      role: "APPLICANT",
      applicantId: applicant.id,
    });

    // Warm welcome message → Overview is never empty. Best-effort.
    try {
      await deliverAdminMessageToApplicant({
        applicantUserId: user.id,
        body:
          "Welcome to Hajr Academy 👋 We're delighted you're interested in teaching with us. " +
          "This is your private space — you'll see announcements and every step of your journey here, " +
          "and you can message our team any time using Messages. We'll be in touch soon!",
        subject: "Welcome to Hajr Academy",
      });
    } catch (e) {
      console.error("[applicants/register] welcome message failed (non-fatal):", e);
    }

    // Notify all admins a new applicant arrived. Best-effort.
    try {
      await notifyAdmins({
        type: "SYSTEM_ANNOUNCEMENT",
        title: `New teacher applicant: ${name}`,
        titleAr: `متقدّم جديد للتدريس: ${name}`,
        body: `${name} just created an applicant account.`,
        bodyAr: `أنشأ ${name} حساب متقدّم للتدريس للتو.`,
        channels: ["inApp", "email"],
        actionUrl: `/admin/applicants/${applicant.id}`,
        actionLabel: "Review applicant",
        actionLabelAr: "مراجعة المتقدّم",
        refType: "ApplicantProfile",
        refId: applicant.id,
      });
    } catch (e) {
      console.error("[applicants/register] admin notify failed (non-fatal):", e);
    }

    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch (e) {
    console.error("[applicants/register]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
