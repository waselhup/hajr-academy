import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { ASSIGNMENT_BUCKET } from "@/lib/assignments/attachments";

export const dynamic = "force-dynamic";

/**
 * GET /api/lab/media?path=<storagePath> — re-sign a private lab media object
 * (audio/video the teacher attached to a LISTENING block, stored in the shared
 * private assignment-media bucket). Any authenticated user may sign; paths are
 * opaque UUIDs only present inside exercises the caller can already open.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const path = req.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });
  try {
    const sb = createSupabaseServiceClient();
    const { data, error } = await sb.storage.from(ASSIGNMENT_BUCKET).createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ url: data.signedUrl });
  } catch {
    return NextResponse.json({ error: "sign error" }, { status: 500 });
  }
}
