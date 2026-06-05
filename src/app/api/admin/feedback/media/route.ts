import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { SURVEY_BUCKET } from "@/lib/survey/media";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/feedback/media?id=<responseId>&kind=voice|video
 *
 * Re-signs a PRIVATE `survey-media` object for inline admin playback AFTER:
 *   1. confirming the caller is ADMIN / SUPER_ADMIN, and
 *   2. looking the path up FROM the response row (never trusting a path in the
 *      query) so only media actually attached to a real response can be signed.
 *
 * Returns { url } with a short-lived signed URL. The public never reaches this.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  const kind = req.nextUrl.searchParams.get("kind");
  if (!id || (kind !== "voice" && kind !== "video")) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  try {
    const row = await prisma.feedbackSurveyResponse.findUnique({
      where: { id },
      select: { voiceUrl: true, videoUrl: true },
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const path = kind === "voice" ? row.voiceUrl : row.videoUrl;
    if (!path) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const supabase = createSupabaseServiceClient();
    const { data: signed, error } = await supabase.storage
      .from(SURVEY_BUCKET)
      .createSignedUrl(path, 3600);
    if (error || !signed) {
      return NextResponse.json({ error: "Could not sign URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (e) {
    console.error("[api/admin/feedback/media] failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
