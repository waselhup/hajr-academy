"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notify";
import { applyToProgram, deliverMessageFromApplicantToAdmin } from "@/lib/applicants/service";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Applicant-side thin wrapper: express interest in a program from the openings
 * page. The service enforces read-only + active-program checks and owns
 * notify()/audit. Server-gated to APPLICANT.
 */
export async function applyToProgramAction(programId: string): Promise<Result> {
  const session = await requireRole("APPLICANT");
  const res = await applyToProgram({
    applicantUserId: session.user.id,
    programId,
  });
  revalidatePath("/applicant/openings");
  revalidatePath("/applicant");
  return res;
}

/**
 * Submit a demo lesson as a LINK (alternative to uploading a file). Validates a
 * basic http(s) URL, records it to admins as a message in the applicant's
 * admin-scoped thread, notifies admins, and audits. Server-gated to APPLICANT.
 */
export async function submitDemoLinkAction(rawLink: string): Promise<Result> {
  const session = await requireRole("APPLICANT");
  const link = (rawLink ?? "").trim();
  if (!/^https?:\/\/.+\..+/.test(link) || link.length > 500) {
    return { ok: false, error: "INVALID_LINK" };
  }

  const applicant = await prisma.applicantProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, fullName: true, isReadOnly: true },
  });
  if (!applicant) return { ok: false, error: "NOT_FOUND" };
  if (applicant.isReadOnly) return { ok: false, error: "READ_ONLY" };

  await prisma.applicantProfile.update({
    where: { id: applicant.id },
    data: { lastActivityAt: new Date() },
  });

  // Deliver the link as a message into the admin-scoped thread (admin sees it).
  await deliverMessageFromApplicantToAdmin({
    applicantUserId: session.user.id,
    body: `📹 Demo lesson link: ${link}`,
    subject: "Demo lesson submission",
  });

  await audit.mutation(session.user.id, "APPLICANT_DEMO_LINK_SUBMITTED", "ApplicantProfile", applicant.id, {
    link,
  });

  try {
    await notifyAdmins({
      type: "SYSTEM_ANNOUNCEMENT",
      title: `Demo link submitted: ${applicant.fullName}`,
      titleAr: `تم إرسال رابط درس تجريبي: ${applicant.fullName}`,
      body: `${applicant.fullName} submitted a demo lesson link.`,
      bodyAr: `أرسل ${applicant.fullName} رابط درس تجريبي.`,
      channels: ["inApp"],
      actionUrl: `/admin/applicants/${applicant.id}`,
      refType: "ApplicantProfile",
      refId: applicant.id,
    });
  } catch (e) {
    console.error("[applicants] demo-link notify failed (non-fatal):", e);
  }

  revalidatePath("/applicant/demo");
  revalidatePath("/applicant");
  return { ok: true };
}
