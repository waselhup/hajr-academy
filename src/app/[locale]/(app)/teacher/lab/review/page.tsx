import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { ASSIGNMENT_BUCKET } from "@/lib/assignments/attachments";
import { isBlockContent } from "@/lib/lab/blocks";
import { LabReviewClient } from "./review-client";

export const dynamic = "force-dynamic";

/** /teacher/lab/review — queue of speaking/writing attempts awaiting a grade. */
export default async function LabReviewPage() {
  const session = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  let items: any[] = [];

  try {
    // Which students this teacher may grade (admins: everyone).
    let studentFilter: any = {};
    if (!isAdmin) {
      const tp = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
      const enr = tp
        ? await prisma.enrollment.findMany({ where: { class: { teacherId: tp.id }, status: "ACTIVE" }, select: { studentId: true } })
        : [];
      studentFilter = { studentId: { in: Array.from(new Set(enr.map((e) => e.studentId))) } };
    }

    const attempts = await prisma.labAttempt.findMany({
      where: { ...studentFilter, status: "COMPLETED", teacherScore: null },
      include: { exercise: true, student: { include: { user: { select: { name: true, nameAr: true } } } } },
      orderBy: { completedAt: "desc" },
      take: 80,
    });

    const svc = createSupabaseServiceClient();
    const sign = async (path?: string | null) => {
      if (!path) return null;
      try {
        const { data } = await svc.storage.from(ASSIGNMENT_BUCKET).createSignedUrl(path, 3600);
        return data?.signedUrl ?? null;
      } catch { return null; }
    };

    for (const a of attempts) {
      const sub: any = a.submission ?? {};
      const media: { label: string; url: string | null; kind: string }[] = [];
      const texts: { label: string; text: string }[] = [];

      if (isBlockContent(a.exercise.content)) {
        for (const b of (a.exercise.content as any).blocks as any[]) {
          if (b.kind === "RECORD") {
            const rec = sub[b.id];
            if (rec?.path) media.push({ label: b.prompt ?? "Speaking", url: await sign(rec.path), kind: b.mediaKind === "VIDEO" ? "VIDEO" : "AUDIO" });
          } else if (b.kind === "SHORT_TEXT") {
            if (sub[b.id]) texts.push({ label: b.prompt ?? "Writing", text: String(sub[b.id]) });
          }
        }
      } else if (a.exercise.type === "SPEAKING") {
        const path = sub.path ?? sub.audioPath ?? sub.recordingPath ?? null;
        if (path) media.push({ label: "Speaking", url: await sign(path), kind: "AUDIO" });
        if (sub.transcript) texts.push({ label: "Transcript", text: String(sub.transcript) });
      } else if (a.exercise.type === "WRITING") {
        if (sub.text) texts.push({ label: "Writing", text: String(sub.text) });
      }

      // Only queue attempts that actually have something subjective to grade.
      if (media.length === 0 && texts.length === 0) continue;

      items.push({
        attemptId: a.id,
        studentName: a.student.user.nameAr ?? a.student.user.name,
        exerciseTitle: a.exercise.titleAr ?? a.exercise.title,
        type: a.exercise.type,
        completedAt: a.completedAt ? a.completedAt.toISOString() : null,
        aiScore: a.score != null ? Number(a.score) : null,
        media,
        texts,
      });
    }
  } catch (e) {
    console.error("[lab-review] failed:", e);
  }

  return <LabReviewClient items={items} />;
}
