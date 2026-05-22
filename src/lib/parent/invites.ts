/**
 * Parent invite lifecycle (Phase 9).
 *
 * An admin issues a `ParentInvite` (6-char code) for a student. A parent
 * redeems it during registration (or from their portal) to create a
 * `ParentStudentLink`. Codes expire after 7 days and are single-use.
 */

import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/invite-code";
import { logAudit } from "@/lib/audit";

/** Days a parent invite stays valid. */
export const INVITE_TTL_DAYS = 7;

/** Create a fresh parent invite for a student. Returns the 6-char code. */
export async function createParentInvite(params: {
  studentId: string;
  email?: string | null;
  phone?: string | null;
  createdBy?: string | null;
}): Promise<{ ok: boolean; code?: string; error?: string }> {
  const student = await prisma.studentProfile.findUnique({
    where: { id: params.studentId },
    select: { id: true },
  });
  if (!student) return { ok: false, error: "Student not found." };

  // Generate a unique 6-char code (retry on the rare collision).
  let code = generateInviteCode(6);
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.parentInvite.findUnique({
      where: { inviteCode: code },
    });
    if (!clash) break;
    code = generateInviteCode(6);
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400_000);
  await prisma.parentInvite.create({
    data: {
      studentId: params.studentId,
      email: params.email ?? null,
      phone: params.phone ?? null,
      inviteCode: code,
      status: "PENDING",
      expiresAt,
      createdBy: params.createdBy ?? null,
    },
  });

  await logAudit({
    userId: params.createdBy ?? null,
    action: "PARENT_INVITE_CREATED",
    entity: "ParentInvite",
    metadata: { studentId: params.studentId, code },
  });

  return { ok: true, code };
}

export interface InviteVerification {
  valid: boolean;
  reason?: string;
  reasonAr?: string;
  inviteId?: string;
  studentId?: string;
  studentName?: string;
}

/**
 * Verify an invite code without consuming it. Auto-expires a stale code.
 * Safe to call from the public registration page.
 */
export async function verifyParentInvite(
  codeStr: string
): Promise<InviteVerification> {
  const code = (codeStr ?? "").trim().toUpperCase();
  if (!code) {
    return {
      valid: false,
      reason: "Enter an invite code.",
      reasonAr: "أدخل رمز الدعوة.",
    };
  }

  const invite = await prisma.parentInvite.findUnique({
    where: { inviteCode: code },
    include: {
      student: { include: { user: { select: { name: true, nameAr: true } } } },
    },
  });
  if (!invite) {
    return {
      valid: false,
      reason: "Invalid invite code.",
      reasonAr: "رمز الدعوة غير صحيح.",
    };
  }
  if (invite.status === "ACCEPTED") {
    return {
      valid: false,
      reason: "This invite code has already been used.",
      reasonAr: "تم استخدام رمز الدعوة هذا مسبقاً.",
    };
  }
  if (invite.status === "REVOKED") {
    return {
      valid: false,
      reason: "This invite code has been revoked.",
      reasonAr: "تم إلغاء رمز الدعوة هذا.",
    };
  }
  if (invite.expiresAt < new Date()) {
    // Lazily flip to EXPIRED so the admin list stays accurate.
    if (invite.status === "PENDING") {
      await prisma.parentInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
    }
    return {
      valid: false,
      reason: "This invite code has expired.",
      reasonAr: "انتهت صلاحية رمز الدعوة.",
    };
  }

  return {
    valid: true,
    inviteId: invite.id,
    studentId: invite.studentId,
    studentName: invite.student.user.nameAr ?? invite.student.user.name,
  };
}

/**
 * Accept an invite for a parent: creates the ParentStudentLink and marks
 * the invite ACCEPTED. Idempotent if the link already exists.
 */
export async function acceptParentInvite(params: {
  codeStr: string;
  parentProfileId: string;
}): Promise<{ ok: boolean; error?: string; errorAr?: string; studentId?: string }> {
  const verification = await verifyParentInvite(params.codeStr);
  if (!verification.valid || !verification.inviteId) {
    return { ok: false, error: verification.reason, errorAr: verification.reasonAr };
  }
  const studentId = verification.studentId!;

  // Create the link if it does not already exist.
  const existing = await prisma.parentStudentLink.findUnique({
    where: {
      parentId_studentId: {
        parentId: params.parentProfileId,
        studentId,
      },
    },
  });
  if (!existing) {
    // First child linked is marked primary.
    const childCount = await prisma.parentStudentLink.count({
      where: { parentId: params.parentProfileId },
    });
    await prisma.parentStudentLink.create({
      data: {
        parentId: params.parentProfileId,
        studentId,
        isPrimary: childCount === 0,
        canPay: true,
      },
    });
  }

  await prisma.parentInvite.update({
    where: { id: verification.inviteId },
    data: { status: "ACCEPTED", acceptedBy: params.parentProfileId },
  });

  await logAudit({
    action: "PARENT_INVITE_ACCEPTED",
    entity: "ParentInvite",
    entityId: verification.inviteId,
    metadata: { parentProfileId: params.parentProfileId, studentId },
  });

  return { ok: true, studentId };
}
