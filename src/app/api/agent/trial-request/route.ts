import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const trialSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^(\+966|05)\d{8,}$/, "Phone must start with 05 or +966"),
  email: z.string().email().optional().or(z.literal("")),
  childGrade: z.string().max(50).optional(),
  preferredProgram: z.string().max(100).optional(),
  preferredTime: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = trialSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const trial = await prisma.trialRequest.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        childGrade: parsed.data.childGrade || null,
        preferredProgram: parsed.data.preferredProgram || null,
        preferredTime: parsed.data.preferredTime || null,
        notes: parsed.data.notes || null,
        source: "landing_page_form",
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: "TRIAL_REQUEST" as const,
          title: `New trial request from ${parsed.data.name}`,
          titleAr: `طلب حصة تجريبية جديد من ${parsed.data.name}`,
          body: `Phone: ${parsed.data.phone}, Program: ${parsed.data.preferredProgram ?? "Not specified"}`,
          bodyAr: `الجوال: ${parsed.data.phone}، البرنامج: ${parsed.data.preferredProgram ?? "غير محدد"}`,
          actionUrl: "/admin/trials",
          actionLabel: "View request",
          actionLabelAr: "عرض الطلب",
          priority: "HIGH" as const,
          refType: "TrialRequest",
          refId: trial.id,
        })),
      });
    }

    // Phase 7: dispatch email + SMS to admins via the comms dispatcher.
    try {
      const { triggerTrialRequestReceived } = await import("@/lib/comms/triggers");
      await triggerTrialRequestReceived(trial.id);
    } catch (e) {
      console.error("[trial-request] dispatch failed:", e);
    }

    await logAudit({
      action: "trial_request_submitted",
      entity: "TrialRequest",
      entityId: trial.id,
      metadata: { name: parsed.data.name, source: "landing_page_form" },
    });

    return NextResponse.json({
      success: true,
      message: "Trial request submitted successfully",
      messageAr: "تم استلام طلبك بنجاح! سيتواصل معك فريقنا خلال 24 ساعة.",
      id: trial.id,
    });
  } catch (err) {
    console.error("[trial-request] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
