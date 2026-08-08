import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { issueAndSendSetupLink } from "@/lib/auth/account-setup";
import { ensurePartnerPromoCode } from "@/lib/finance/partner-referrals";

export const dynamic = "force-dynamic";

/**
 * Admin review of Success Partner applications.
 *
 * Approving does in one click what used to be a sequence of manual jobs:
 * create the partner record, mint their discount code, create a contact
 * login, and send that contact a link to choose their own password. The
 * admin never handles a password.
 */

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

/** Clamp a percentage the admin typed into a sane range. */
function pct(v: unknown, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 0), 100);
}

async function gate() {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized", status: 401 as const };
  if (!ADMIN_ROLES.includes(session.user.role)) {
    return { error: "Admins only", status: 403 as const };
  }
  return { session };
}

/** GET — the review queue. */
export async function GET(req: NextRequest) {
  const g = await gate();
  if ("error" in g) return NextResponse.json({ error: g.error }, { status: g.status });

  const status = req.nextUrl.searchParams.get("status");
  const rows = await prisma.partnerApplication.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({
    applications: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
    })),
  });
}

/** POST — approve or reject. Body: { id, action: "approve"|"reject", note? } */
export async function POST(req: NextRequest) {
  const g = await gate();
  if ("error" in g) return NextResponse.json({ error: g.error }, { status: g.status });

  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    const action = body.action === "reject" ? "reject" : "approve";
    const note = typeof body.note === "string" ? body.note.slice(0, 500) : null;
    // Commercial terms are the owner's decision, taken at approval time.
    const discountPercent = pct(body.discountPercent, 10);
    const commissionPercent = pct(body.commissionPercent, 0);
    // A sponsor usually backs a student for a whole term, so the discount
    // repeats by default; the commission still pays once either way.
    const discountRecurs = body.discountRecurs !== false;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const app = await prisma.partnerApplication.findUnique({ where: { id } });
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (app.status !== "PENDING") {
      return NextResponse.json(
        { error: "This application has already been reviewed." },
        { status: 409 }
      );
    }

    // Claim it atomically: approving creates a partner and a promo code, and
    // a double-click on a slow connection would otherwise create two of each.
    const claim = await prisma.partnerApplication.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: action === "reject" ? "REJECTED" : "APPROVED",
        reviewedBy: g.session.user.id,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    });
    if (claim.count === 0) {
      return NextResponse.json(
        { error: "This application has already been reviewed." },
        { status: 409 }
      );
    }

    if (action === "reject") {
      await logAudit({
        userId: g.session.user.id,
        action: "PARTNER_APPLICATION_REJECTED",
        entity: "PartnerApplication",
        entityId: id,
        metadata: { note },
      });
      return NextResponse.json({ ok: true, status: "REJECTED" });
    }

    // ── Approve ──────────────────────────────────────────────────────
    const now = new Date();
    const contractEnd = new Date(now);
    contractEnd.setFullYear(contractEnd.getFullYear() + 1);

    const partner = await prisma.partnerSchool.create({
      data: {
        nameAr: app.orgNameAr,
        nameEn: app.orgNameEn ?? app.orgNameAr,
        contactName: app.contactName,
        contactEmail: app.contactEmail,
        contactPhone: app.contactPhone,
        city: app.city,
        crNumber: app.crNumber,
        partnerType: app.partnerType,
        contractStart: now,
        contractEnd,
        // Retainers are retired: a partner earns a share of what they bring in.
        monthlyFeeSar: 0,
        commissionPercent,
        discountRecurs,
        studentCap: app.expectedStudents ?? 0,
        active: true,
        notes: `Created from public application ${app.id}`,
      },
      select: { id: true },
    });

    // The discount code the partner hands to the people they refer — the
    // whole referral mechanism hangs off it, so it is minted at approval.
    const promo = await ensurePartnerPromoCode({
      partnerSchoolId: partner.id,
      nameEn: app.orgNameEn ?? app.orgNameAr,
      nameAr: app.orgNameAr,
      discountPercent,
      discountRecurs,
      expiresAt: contractEnd,
      createdBy: g.session.user.id,
    });
    const code = promo.code;

    // ── A login for the partner contact, with no password to hand over ──
    let setupUrl: string | undefined;
    let emailed = false;
    let whatsappUrl: string | undefined;
    const email = app.contactEmail.toLowerCase();
    try {
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      const user =
        existing ??
        (await prisma.user.create({
          data: {
            email,
            passwordHash: `nologin:${crypto.randomUUID()}`,
            name: app.contactName,
            phone: app.contactPhone,
            role: "PARENT", // closest existing portal for a sponsor
            emailVerified: false,
            parentProfile: { create: {} },
          },
          select: { id: true },
        }));

      if (existing) {
        await notify({
          userId: user.id,
          type: "SYSTEM_ANNOUNCEMENT",
          title: "Your partnership is approved",
          titleAr: "تمت الموافقة على شراكتك",
          body: `Welcome aboard. Your discount code is ${code ?? "—"}.`,
          bodyAr: `أهلاً بك شريكاً. رمز الخصم الخاص بك: ${code ?? "—"}.`,
          channels: ["inApp", "email"],
          priority: "HIGH",
        }).catch(() => {});
      } else {
        const delivery = await issueAndSendSetupLink({
          userId: user.id,
          email,
          name: app.contactName,
          phone: app.contactPhone,
          kind: "partner",
        });
        setupUrl = delivery.setupUrl;
        emailed = delivery.emailed;
        whatsappUrl = delivery.whatsappUrl;
      }
    } catch (e) {
      // The partner and the code exist; a missing login is an admin follow-up.
      console.error("[partner-applications] contact login failed:", e);
    }

    await prisma.partnerApplication.update({
      where: { id },
      data: {
        partnerSchoolId: partner.id,
        promoCode: code,
        setupUrl: setupUrl ?? null,
      },
    });

    await logAudit({
      userId: g.session.user.id,
      action: "PARTNER_APPLICATION_APPROVED",
      entity: "PartnerApplication",
      entityId: id,
      metadata: {
        partnerSchoolId: partner.id,
        promoCode: code,
        discountPercent,
        commissionPercent,
        emailed,
      },
    });

    return NextResponse.json({
      ok: true,
      status: "APPROVED",
      partnerSchoolId: partner.id,
      promoCode: code,
      discountPercent,
      commissionPercent,
      setupUrl,
      emailed,
      whatsappUrl,
    });
  } catch (e) {
    console.error("[admin/partner-applications] failed:", e);
    return NextResponse.json({ error: "Could not process the application" }, { status: 500 });
  }
}
