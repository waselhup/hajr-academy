import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { ipFromHeaders, shortHash } from "@/lib/analytics/hashing";

export const dynamic = "force-dynamic";

/**
 * POST /api/partners/apply — public application to become a Success Partner.
 *
 * Until now a partner could only exist if an admin typed them in by hand,
 * so there was no way for a charity or a school to approach the academy at
 * all. This records an application and notifies the admins; nothing about
 * the partner is created until someone approves it.
 */

const schema = z.object({
  orgNameAr: z.string().min(2).max(160),
  orgNameEn: z.string().max(160).optional().or(z.literal("")),
  partnerType: z.enum(["CHARITY", "SCHOOL", "INDIVIDUAL"]),
  contactName: z.string().min(2).max(120),
  contactEmail: z.string().email(),
  contactPhone: z
    .string()
    .regex(/^(\+966|05)\d{8,}$/, "Phone must start with 05 or +966"),
  city: z.string().min(2).max(80),
  crNumber: z.string().max(40).optional().or(z.literal("")),
  expectedStudents: z.number().int().min(0).max(100000).optional(),
  about: z.string().min(20).max(2000),
});

export async function POST(req: Request) {
  const ipHash = shortHash(ipFromHeaders(req.headers) ?? "");
  const rl = rateLimit(`partner-apply:${ipHash || "anon"}`, 5, 30 * 60_000);
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
    const email = d.contactEmail.trim().toLowerCase();

    // One open application per organisation contact — a second submission
    // updates the first rather than filling the admin queue with duplicates.
    const existing = await prisma.partnerApplication.findFirst({
      where: { contactEmail: email, status: "PENDING" },
      select: { id: true },
    });

    const data = {
      orgNameAr: d.orgNameAr,
      orgNameEn: d.orgNameEn || null,
      partnerType: d.partnerType,
      contactName: d.contactName,
      contactEmail: email,
      contactPhone: d.contactPhone,
      city: d.city,
      crNumber: d.crNumber || null,
      expectedStudents: d.expectedStudents ?? null,
      about: d.about,
    };

    const app = existing
      ? await prisma.partnerApplication.update({
          where: { id: existing.id },
          data,
          select: { id: true },
        })
      : await prisma.partnerApplication.create({
          data,
          select: { id: true },
        });

    await logAudit({
      action: existing ? "PARTNER_APPLICATION_UPDATED" : "PARTNER_APPLICATION_RECEIVED",
      entity: "PartnerApplication",
      entityId: app.id,
      metadata: { orgNameAr: d.orgNameAr, partnerType: d.partnerType, city: d.city },
    });

    try {
      await notifyAdmins({
        type: "SYSTEM_ANNOUNCEMENT",
        title: `Success partner application — ${d.orgNameAr}`,
        titleAr: `طلب شراكة نجاح — ${d.orgNameAr}`,
        body: `${d.contactName} (${d.contactPhone}) from ${d.city} applied as a ${d.partnerType.toLowerCase()} partner. Review it in /admin/schools.`,
        bodyAr: `${d.contactName} (${d.contactPhone}) من ${d.city} قدّم طلب شراكة. راجعه من صفحة شركاء النجاح.`,
        channels: ["inApp", "email"],
        priority: "HIGH",
        refType: "PartnerApplication",
        refId: app.id,
        actionUrl: "/admin/schools",
      });
    } catch (e) {
      console.error("[partners/apply] notify failed:", e);
    }

    return NextResponse.json({ success: true, id: app.id });
  } catch (e) {
    console.error("[partners/apply] failed:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
