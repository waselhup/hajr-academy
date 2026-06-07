import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseServiceClient } from "@/lib/supabase";
import {
  ASSIGNMENT_BUCKET,
  canAccessAssignment,
  canAccessSubmission,
} from "@/lib/assignments/attachments";

export const dynamic = "force-dynamic";

/**
 * GET /api/assignments/attachment?type=assignment|submission&id=<attachmentId>
 *
 * Re-signs a private `assignment-media` object for playback/download AFTER
 * a server-side access check:
 *   - assignment attachment → owning teacher, enrolled student, or admin
 *   - submission attachment → the student who owns it, the class teacher, or admin
 *
 * Returns { url } with a short-lived signed URL. Never exposes the raw path
 * to a caller who isn't authorized.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type");
  const id = req.nextUrl.searchParams.get("id");
  if (!id || (type !== "assignment" && type !== "submission")) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const actor = { userId: session.user.id, role: session.user.role };

  try {
    let path: string | null = null;
    let download = false;
    let kind: string | null = null;

    if (type === "assignment") {
      const att = await prisma.assignmentAttachment.findUnique({
        where: { id },
        select: { url: true, assignmentId: true, kind: true },
      });
      if (!att) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (!(await canAccessAssignment(att.assignmentId, actor))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      path = att.url;
      kind = att.kind;
      download = att.kind === "FILE";
    } else {
      const att = await prisma.submissionAttachment.findUnique({
        where: { id },
        select: { url: true, submissionId: true, kind: true },
      });
      if (!att) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (!(await canAccessSubmission(att.submissionId, actor))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      path = att.url;
      kind = att.kind;
      download = att.kind === "FILE";
    }

    if (!path) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // LINK attachments store the external URL directly — no bucket, no signing.
    // The access check above already gated this caller, so it's safe to return.
    if (kind === "LINK") {
      return NextResponse.json({ url: path });
    }

    const supabase = createSupabaseServiceClient();
    const { data: signed, error } = await supabase.storage
      .from(ASSIGNMENT_BUCKET)
      .createSignedUrl(path, 3600, download ? { download: true } : undefined);
    if (error || !signed) {
      return NextResponse.json({ error: "Could not sign URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (e) {
    console.error("[api/assignments/attachment] failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
