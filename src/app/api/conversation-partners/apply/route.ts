import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { ipFromHeaders, shortHash } from "@/lib/analytics/hashing";
import { normalizeInternationalPhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * POST /api/conversation-partners/apply — public application to converse
 * with HAJR students.
 *
 * Nothing about the applicant exists on the platform until an admin
 * approves: no account, no role, no access. This route only records the
 * application and tells the admins about it.
 *
 * Phones are international by definition here — conversation partners are
 * recruited abroad, so a Saudi-only rule would reject the entire audience.
 */

const schema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(6).max(30),
  country: z.string().min(2).max(80),
  nativeLanguage: z.string().min(2).max(60),
  otherLanguages: z.string().max(160).optional().or(z.literal("")),
  timezone: z.string().min(2).max(60),
  availability: z.string().min(5).max(600),
  about: z.string().min(20).max(2000),
  linkedin: z.string().max(200).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const ipHash = shortHash(ipFromHeaders(req.headers) ?? "");
  const rl = rateLimit(`cp-apply:${ipHash || "anon"}`, 5, 30 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many applications. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      }
    );
  }

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;
    const email = d.email.trim().toLowerCase();
    const phone = normalizeInternationalPhone(d.phone);
    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid phone number including its country code." },
        { status: 400 }
      );
    }

    // A second submission from the same person updates the first rather than
    // filling the review queue with duplicates.
    const existing = await prisma.conversationPartnerApplication.findFirst({
      where: { email, status: "PENDING" },
      select: { id: true },
    });

    const data = {
      fullName: d.fullName.trim(),
      email,
      phone,
      country: d.country.trim(),
      nativeLanguage: d.nativeLanguage.trim(),
      otherLanguages: d.otherLanguages?.trim() || null,
      timezone: d.timezone.trim(),
      availability: d.availability.trim(),
      about: d.about.trim(),
      linkedin: d.linkedin?.trim() || null,
    };

    const app = existing
      ? await prisma.conversationPartnerApplication.update({
          where: { id: existing.id },
          data,
          select: { id: true },
        })
      : await prisma.conversationPartnerApplication.create({
          data,
          select: { id: true },
        });

    await logAudit({
      action: existing
        ? "CONVERSATION_PARTNER_APPLICATION_UPDATED"
        : "CONVERSATION_PARTNER_APPLICATION_RECEIVED",
      entity: "ConversationPartnerApplication",
      entityId: app.id,
      metadata: { country: d.country, nativeLanguage: d.nativeLanguage },
    });

    try {
      await notifyAdmins({
        type: "SYSTEM_ANNOUNCEMENT",
        title: `Conversation partner application — ${data.fullName}`,
        titleAr: `طلب شريك محادثة — ${data.fullName}`,
        body: `${data.country} · native ${data.nativeLanguage} · ${data.timezone}. Review it in /admin/conversation-partners.`,
        bodyAr: `${data.country} · اللغة الأم ${data.nativeLanguage} · ${data.timezone}. راجعه من صفحة شركاء المحادثة.`,
        channels: ["inApp", "email"],
        priority: "HIGH",
        refType: "ConversationPartnerApplication",
        refId: app.id,
        actionUrl: "/admin/conversation-partners",
      });
    } catch (e) {
      console.error("[conversation-partners/apply] notify failed:", e);
    }

    return NextResponse.json({ success: true, id: app.id });
  } catch (e) {
    console.error("[conversation-partners/apply] failed:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
