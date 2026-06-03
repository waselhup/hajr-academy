import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseServiceClient } from "@/lib/supabase";
import {
  CLASS_RESOURCE_BUCKET,
  canAccessClassResources,
} from "@/lib/class-resources/resources";

export const dynamic = "force-dynamic";

/**
 * GET /api/class-resources/file?id=<resourceId>
 *
 * Re-signs a private `class-resources` object for inline preview / download
 * AFTER a server-side access check: only a teacher currently assigned to the
 * resource's class (or an admin) may fetch. Returns { url } with a short-lived
 * signed URL — the raw storage path is never exposed to an unauthorized caller.
 *
 * Documents (FILE that isn't an image) are signed with `download`; media and
 * images are signed for inline playback/preview.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const actor = { userId: session.user.id, role: session.user.role };

  try {
    const res = await prisma.classResource.findUnique({
      where: { id },
      select: { url: true, classId: true, kind: true, mimeType: true },
    });
    if (!res) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!(await canAccessClassResources(res.classId, actor))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Inline for media + images; force download for other documents.
    const isImage = res.mimeType.startsWith("image/");
    const inline = res.kind === "VIDEO" || res.kind === "AUDIO" || isImage;

    const supabase = createSupabaseServiceClient();
    const { data: signed, error } = await supabase.storage
      .from(CLASS_RESOURCE_BUCKET)
      .createSignedUrl(res.url, 3600, inline ? undefined : { download: true });
    if (error || !signed) {
      return NextResponse.json({ error: "Could not sign URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (e) {
    console.error("[api/class-resources/file] failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
