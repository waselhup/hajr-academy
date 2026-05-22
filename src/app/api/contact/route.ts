import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/comms/email";
import { createNotifications } from "@/lib/comms/in-app";

export const dynamic = "force-dynamic";

const SUBJECTS = [
  "GENERAL",
  "PROGRAMS",
  "PRICING",
  "SUPPORT",
  "COMPLAINT",
  "PARTNERSHIP",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/contact — public contact form submission. NO auth required.
 *
 * Body: { name, email, phone?, subject, message, source? }
 *
 * Persists a ContactSubmission, notifies admins in-app, and emails the
 * team. Used by the /contact page and the Hajr public assistant.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    const subject = String(body.subject ?? "GENERAL").trim().toUpperCase();
    const message = String(body.message ?? "").trim();
    const source =
      body.source === "public_assistant" ? "public_assistant" : "contact_form";

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email and message are required" },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }
    if (name.length > 120 || message.length > 4000) {
      return NextResponse.json({ error: "Input too long" }, { status: 400 });
    }
    const safeSubject = SUBJECTS.includes(subject) ? subject : "GENERAL";

    const submission = await prisma.contactSubmission.create({
      data: {
        name,
        email,
        phone,
        subject: safeSubject,
        message,
        source,
        status: "NEW",
      },
    });

    // Notify all admins in-app.
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
        select: { id: true },
      });
      if (admins.length > 0) {
        await createNotifications(
          admins.map((a) => a.id),
          {
            type: "SYSTEM_ANNOUNCEMENT",
            title: `New contact request from ${name}`,
            titleAr: `طلب تواصل جديد من ${name}`,
            body: message.slice(0, 140),
            bodyAr: message.slice(0, 140),
            actionUrl: "/admin/communications/contacts",
            actionLabel: "View request",
            actionLabelAr: "عرض الطلب",
            priority: "HIGH",
            refType: "ContactSubmission",
            refId: submission.id,
          }
        );
      }

      // Best-effort email to the team.
      sendEmail({
        to: process.env.RESEND_FROM_EMAIL || "hello@hajr.academy",
        subject: `[Contact] ${safeSubject} — ${name}`,
        html: `<h3>New contact request</h3>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
<p><strong>Subject:</strong> ${safeSubject}</p>
<p><strong>Message:</strong></p>
<p>${message.replace(/\n/g, "<br/>")}</p>`,
      }).catch(() => {});
    } catch (e) {
      console.error("[api/contact] notify failed:", e);
    }

    return NextResponse.json({ ok: true, id: submission.id });
  } catch (e) {
    console.error("[api/contact] failed:", e);
    return NextResponse.json(
      { error: "Failed to submit. Please try again." },
      { status: 500 }
    );
  }
}
