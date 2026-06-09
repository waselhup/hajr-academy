import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notify";
import { audit } from "@/lib/audit";
import { generateUniqueReferralCode } from "@/lib/marketer/codes";
import { sendEmail } from "@/lib/comms/email";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9 \-]{7,20}$/;

const AUDIENCES = [
  "PARENTS",
  "SCHOOL_STUDENTS",
  "UNIVERSITY_STUDENTS",
  "JOB_SEEKERS",
  "EMPLOYEES",
  "OTHER",
] as const;
const CAPACITIES = ["RANGE_1_5", "RANGE_6_10", "RANGE_11_20", "RANGE_20_PLUS"] as const;

const WORD_LIMIT = 100;
/** Word count = trimmed value split on whitespace (mirrors the client counter). */
const countWords = (s: string) => {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
};
/** A required free-text answer: non-empty after trim, length-capped. */
const requiredText = (max = 2000) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1).max(max));
/** A capped answer: required, non-empty, AND <= WORD_LIMIT words. */
const cappedText = () =>
  requiredText(2000).refine((s) => countWords(s) <= WORD_LIMIT, {
    message: `Answer exceeds ${WORD_LIMIT} words`,
  });

const AnswersSchema = z
  .object({
    introduceYourself: requiredText(),
    experience: requiredText(),
    audiences: z.array(z.enum(AUDIENCES)).nonempty(),
    audiencesOther: z.string().optional().default("").transform((s) => s.trim()),
    channels: requiredText(),
    convince: cappedText(),
    monthlyCapacity: z.enum(CAPACITIES),
    whySuccessful: cappedText(),
  })
  // audiencesOther is required iff OTHER was chosen; drop it otherwise.
  .superRefine((val, ctx) => {
    const hasOther = val.audiences.includes("OTHER");
    if (hasOther && !val.audiencesOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["audiencesOther"],
        message: "audiencesOther is required when OTHER is selected",
      });
    }
    if (!hasOther) val.audiencesOther = "";
    // De-duplicate the audience list defensively.
    val.audiences = Array.from(new Set(val.audiences)) as typeof val.audiences;
  });

const BodySchema = z.object({
  name: requiredText(120),
  email: requiredText(160),
  phone: requiredText(20),
  social: z.string().optional().default("").transform((s) => s.trim().slice(0, 500)),
  answers: AnswersSchema,
});

/** Human-readable enum labels for the back-compat `notes` summary (EN). */
const AUDIENCE_LABELS: Record<string, string> = {
  PARENTS: "Parents",
  SCHOOL_STUDENTS: "School students",
  UNIVERSITY_STUDENTS: "University students",
  JOB_SEEKERS: "Job seekers",
  EMPLOYEES: "Employees",
  OTHER: "Other",
};
const CAPACITY_LABELS: Record<string, string> = {
  RANGE_1_5: "1-5",
  RANGE_6_10: "6-10",
  RANGE_11_20: "11-20",
  RANGE_20_PLUS: "20+",
};

function makeTempPassword(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const where = first?.path?.length ? `${first.path.join(".")}: ` : "";
      return NextResponse.json(
        { error: `Invalid application — ${where}${first?.message ?? "validation failed"}` },
        { status: 400 }
      );
    }

    const { name, social, answers } = parsed.data;
    const email = parsed.data.email.toLowerCase();
    const phone = parsed.data.phone;

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (!PHONE_RE.test(phone)) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
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

    // answersJson is the source of truth; notes keeps a short human summary for
    // back-compat with the old free-text rendering.
    const audienceLine = answers.audiences
      .map((a) => (a === "OTHER" && answers.audiencesOther ? answers.audiencesOther : AUDIENCE_LABELS[a]))
      .join(", ");
    const notesSummary = [
      `Introduce: ${answers.introduceYourself}`,
      `Experience: ${answers.experience}`,
      `Audiences: ${audienceLine}`,
      `Channels: ${answers.channels}`,
      `Convince: ${answers.convince}`,
      `Monthly: ${CAPACITY_LABELS[answers.monthlyCapacity]}`,
      `Why successful: ${answers.whySuccessful}`,
      social ? `Social: ${social}` : null,
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 4000);

    // Persist the social handle alongside the 7 structured answers so the admin
    // section can surface it without a separate column.
    const answersJson = { ...answers, social } as Prisma.InputJsonValue;

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
          notes: notesSummary,
          answersJson,
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
      html: `<p>Hello ${name},</p><p>We received your marketer application. Our team will review it within 48 hours.</p><p>مرحباً ${name}، تم استلام طلبك للانضمام كمسوّق. سنراجعه خلال 48 ساعة.</p>`,
      text: `Hello ${name}, we received your marketer application.`,
    }).catch(() => {});

    return NextResponse.json({ ok: true, applicationId: result.profile.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
