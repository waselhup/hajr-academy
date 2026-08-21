import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { issueAndSendSetupLink } from "@/lib/auth/account-setup";

export const dynamic = "force-dynamic";

/**
 * Admin review of conversation-partner applications.
 *
 * Approving is the single step that turns an application into a usable
 * account: it creates the login, the partner profile, and sends the person
 * their access details. Nothing exists before that point.
 *
 * The email carries their username (their email address) and a single-use
 * link to choose their own password — the platform has no path that mails a
 * password in plaintext, and this is not the place to invent one.
 */

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

async function gate() {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized", status: 401 as const };
  if (!ADMIN_ROLES.includes(session.user.role)) {
    return { error: "Admins only", status: 403 as const };
  }
  return { session };
}

export async function GET(req: NextRequest) {
  const g = await gate();
  if ("error" in g) return NextResponse.json({ error: g.error }, { status: g.status });

  const status = req.nextUrl.searchParams.get("status");
  const rows = await prisma.conversationPartnerApplication.findMany({
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
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const app = await prisma.conversationPartnerApplication.findUnique({ where: { id } });
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (app.status !== "PENDING") {
      return NextResponse.json(
        { error: "This application has already been reviewed." },
        { status: 409 }
      );
    }

    // Claim it atomically — approving creates an account, and a double click
    // on a slow connection would otherwise create two.
    const claim = await prisma.conversationPartnerApplication.updateMany({
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
        action: "CONVERSATION_PARTNER_REJECTED",
        entity: "ConversationPartnerApplication",
        entityId: id,
        metadata: { note },
      });
      return NextResponse.json({ ok: true, status: "REJECTED" });
    }

    // ── Approve: create the login + the partner profile ────────────────
    const email = app.email.toLowerCase();
    let userId: string | undefined;
    let setupUrl: string | undefined;
    let emailed = false;
    let emailError: string | undefined;
    let warning: string | undefined;

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, passwordHash: true },
    });

    if (existing && !["CONVERSATION_PARTNER", "APPLICANT"].includes(existing.role)) {
      // The address already belongs to a student/teacher/admin. Re-purposing
      // that account would hand a different role to a real person.
      await prisma.conversationPartnerApplication.update({
        where: { id },
        data: { reviewNote: `${note ?? ""}\n[auto] email already used by a ${existing.role} account`.trim() },
      });
      return NextResponse.json({
        ok: true,
        status: "APPROVED",
        warning:
          `البريد ${email} مستخدم بالفعل لحساب ${existing.role}. أُعتمد الطلب لكن لم يُنشأ حساب — تواصل معه لاختيار بريد آخر.`,
      });
    }

    try {
      const user =
        existing ??
        (await prisma.user.create({
          data: {
            email,
            // No password ever travels: they set their own via the link.
            passwordHash: `nologin:${crypto.randomUUID()}`,
            name: app.fullName,
            phone: app.phone,
            role: "CONVERSATION_PARTNER",
            preferredLang: "EN",
            emailVerified: false,
          },
          select: { id: true },
        }));
      userId = user.id;

      if (existing) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "CONVERSATION_PARTNER", name: app.fullName, phone: app.phone },
        });
      }

      await prisma.conversationPartnerProfile.upsert({
        where: { userId: user.id },
        update: {
          country: app.country,
          // These moved off the application form; the profile columns are
          // still required, so fall back rather than write null.
          nativeLanguage: app.nativeLanguage ?? "English",
          otherLanguages: app.otherLanguages,
          timezone: app.timezone ?? "GMT",
          availability: app.availabilityWindows.join(", ") || app.availability || "—",
          isActive: true,
          applicationId: app.id,
        },
        create: {
          userId: user.id,
          country: app.country,
          nativeLanguage: app.nativeLanguage ?? "English",
          otherLanguages: app.otherLanguages,
          timezone: app.timezone ?? "GMT",
          availability: app.availabilityWindows.join(", ") || app.availability || "—",
          applicationId: app.id,
        },
      });

      const canAlreadyLogIn = !!existing && !existing.passwordHash.startsWith("nologin:");
      if (canAlreadyLogIn) {
        await notify({
          userId: user.id,
          type: "SYSTEM_ANNOUNCEMENT",
          title: "You're approved as a conversation partner",
          titleAr: "تمت الموافقة عليك كشريك محادثة",
          body: "Sign in to see the sessions you are invited to.",
          bodyAr: "سجّل الدخول لرؤية الجلسات المدعو إليها.",
          channels: ["inApp", "email"],
          priority: "HIGH",
          actionUrl: "/speaking-partner",
        }).catch(() => {});
        emailed = true;
      } else {
        const delivery = await issueAndSendSetupLink({
          userId: user.id,
          email,
          name: app.fullName,
          phone: app.phone,
          locale: "en",
          kind: "conversation-partner",
        });
        setupUrl = delivery.setupUrl;
        emailed = delivery.emailed;
        emailError = delivery.emailError;
      }
    } catch (e) {
      console.error("[admin/conversation-partners] account creation failed:", e);
      warning =
        "اعتُمد الطلب لكن تعذّر إنشاء الحساب. أعد المحاولة أو أنشئه يدوياً.";
    }

    await prisma.conversationPartnerApplication.update({
      where: { id },
      data: { userId: userId ?? null, setupUrl: setupUrl ?? null },
    });

    await logAudit({
      userId: g.session.user.id,
      action: "CONVERSATION_PARTNER_APPROVED",
      entity: "ConversationPartnerApplication",
      entityId: id,
      metadata: { userId: userId ?? null, emailed, emailError: emailError ?? null },
    });

    return NextResponse.json({
      ok: true,
      status: "APPROVED",
      userId,
      loginEmail: email,
      setupUrl,
      emailed,
      emailError,
      warning,
    });
  } catch (e) {
    console.error("[admin/conversation-partners] failed:", e);
    return NextResponse.json({ error: "Could not process the application" }, { status: 500 });
  }
}
