"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { normalizeSaudiPhone } from "@/lib/utils";

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

async function ipFromHeaders() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? null;
}

// PackageType (order) → StudentProfile.activePackage enum (which only has
// ESSENTIAL/INTEGRATED/PRIVATE/SCHOOL). Prep packages map to the closest base.
function packageToActive(pkg: string): "ESSENTIAL" | "INTEGRATED" | "PRIVATE" | "SCHOOL" {
  switch (pkg) {
    case "ESSENTIAL":
      return "ESSENTIAL";
    case "PRIVATE":
    case "IELTS_PREP_PKG":
      return "PRIVATE";
    case "SCHOOL":
      return "SCHOOL";
    default:
      return "INTEGRATED"; // INTEGRATED, STEP_PREP_PKG
  }
}

const provisionSchema = z.object({
  orderId: z.string(),
  // Admin completes/confirms these (email is required to create a login).
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  gender: z.enum(["MALE", "FEMALE"]).default("MALE"),
  englishLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).default("BEGINNER"),
  schoolId: z.string().optional().nullable(),
  classId: z.string().optional().nullable(),
  password: z.string().min(8).optional(),
});

/**
 * Provision a student account from a paid PurchaseOrder:
 * creates the User + StudentProfile, optionally enrols them in a class,
 * sends a welcome notification, and advances the order status.
 */
export async function provisionOrderAction(
  input: z.infer<typeof provisionSchema>
): Promise<Result<{ studentId: string }>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = provisionSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "VALIDATION: " + parsed.error.issues.map((i) => i.message).join(", ") };

  const order = await prisma.purchaseOrder.findUnique({ where: { id: parsed.data.orderId } });
  if (!order) return { ok: false, error: "ORDER_NOT_FOUND" };
  if (order.status === "COMPLETED" || order.provisionedStudentId)
    return { ok: false, error: "ALREADY_PROVISIONED" };

  const phone = normalizeSaudiPhone(parsed.data.phone);
  if (!phone) return { ok: false, error: "INVALID_PHONE" };

  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { ok: false, error: "EMAIL_EXISTS" };

  const passwordHash = await bcrypt.hash(parsed.data.password ?? "Hajr@2026", 10);

  try {
    // 1) Create the student account.
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: parsed.data.name,
        phone,
        role: "STUDENT",
        emailVerified: false,
        studentProfile: {
          create: {
            gender: parsed.data.gender,
            englishLevel: parsed.data.englishLevel,
            schoolId: parsed.data.schoolId ?? null,
            activePackage: packageToActive(order.packageType),
            packageStartedAt: new Date(),
          },
        },
      },
      include: { studentProfile: { select: { id: true } } },
    });

    // 2) Optionally enrol in a class (validates gender + capacity).
    let enrolled = false;
    if (parsed.data.classId && user.studentProfile) {
      const cls = await prisma.class.findUnique({
        where: { id: parsed.data.classId },
        select: { genderRestriction: true, maxStudents: true, _count: { select: { enrollments: true } } },
      });
      if (cls && cls._count.enrollments < cls.maxStudents) {
        // gender check: null restriction = any; else must match
        const genderOk = !cls.genderRestriction || cls.genderRestriction === parsed.data.gender;
        if (genderOk) {
          await prisma.enrollment.upsert({
            where: { studentId_classId: { studentId: user.studentProfile.id, classId: parsed.data.classId } },
            create: { studentId: user.studentProfile.id, classId: parsed.data.classId },
            update: { status: "ACTIVE" },
          });
          enrolled = true;
        }
      }
    }

    // 3) Welcome notification to the new student (in-app + email).
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "ENROLLMENT_UPDATE",
        title: "Welcome to HAJR Academy",
        titleAr: "أهلاً بك في أكاديمية هجر",
        body: "Your account is ready. Log in to start learning.",
        bodyAr: "حسابك جاهز. سجّل الدخول لتبدأ التعلّم.",
        actionUrl: "/student",
        actionLabel: "Open dashboard",
        actionLabelAr: "افتح لوحتك",
        priority: "HIGH",
        refType: "User",
        refId: user.id,
      },
    });

    // 4) Advance the order.
    await prisma.purchaseOrder.update({
      where: { id: order.id },
      data: {
        status: enrolled ? "ENROLLED" : "STUDENT_CREATED",
        provisionedStudentId: user.id,
        assignedClassId: enrolled ? parsed.data.classId : null,
        handledBy: session.user.id,
        handledAt: new Date(),
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "ORDER_PROVISIONED",
      entity: "PurchaseOrder",
      entityId: order.id,
      metadata: { studentUserId: user.id, enrolled, classId: parsed.data.classId ?? null },
      ipAddress: await ipFromHeaders(),
    });

    revalidatePath("/admin/orders");
    return { ok: true, data: { studentId: user.id } };
  } catch (e: any) {
    return { ok: false, error: e?.code === "P2002" ? "EMAIL_EXISTS" : e?.message ?? "DB_ERROR" };
  }
}

export async function cancelOrderAction(orderId: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const order = await prisma.purchaseOrder.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) return { ok: false, error: "NOT_FOUND" };
  if (order.status === "COMPLETED") return { ok: false, error: "CANNOT_CANCEL_COMPLETED" };
  await prisma.purchaseOrder.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  await logAudit({
    userId: session.user.id,
    action: "ORDER_CANCELLED",
    entity: "PurchaseOrder",
    entityId: orderId,
    ipAddress: await ipFromHeaders(),
  });
  revalidatePath("/admin/orders");
  return { ok: true, data: null };
}
