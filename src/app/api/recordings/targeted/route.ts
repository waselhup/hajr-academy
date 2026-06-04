import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseServiceClient } from "@/lib/supabase";
import {
  TARGETED_RECORDINGS_BUCKET,
  TARGETED_SIGNED_URL_TTL,
} from "@/lib/recordings/targeted";

export const dynamic = "force-dynamic";

/**
 * GET /api/recordings/targeted — the CURRENT user's targeted recordings.
 *
 * Joins via TargetedRecordingViewer where userId = session.user.id, and mints
 * a fresh short-lived signed playback URL for each (never a public URL). Only
 * recordings the user is a viewer of are returned — visibility is server-side.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const links = await prisma.targetedRecordingViewer.findMany({
      where: { userId: session.user.id },
      orderBy: { recording: { createdAt: "desc" } },
      take: 100,
      select: {
        id: true,
        viewedAt: true,
        recording: {
          select: {
            id: true,
            title: true,
            titleAr: true,
            description: true,
            descriptionAr: true,
            storagePath: true,
            mimeType: true,
            sizeBytes: true,
            durationSec: true,
            createdAt: true,
          },
        },
      },
    });

    const supabase = createSupabaseServiceClient();
    const recordings = await Promise.all(
      links.map(async (link) => {
        const { data: signed } = await supabase.storage
          .from(TARGETED_RECORDINGS_BUCKET)
          .createSignedUrl(link.recording.storagePath, TARGETED_SIGNED_URL_TTL);
        return {
          id: link.recording.id,
          title: link.recording.title,
          titleAr: link.recording.titleAr,
          description: link.recording.description,
          descriptionAr: link.recording.descriptionAr,
          mimeType: link.recording.mimeType,
          sizeBytes: link.recording.sizeBytes,
          durationSec: link.recording.durationSec,
          createdAt: link.recording.createdAt.toISOString(),
          viewedAt: link.viewedAt ? link.viewedAt.toISOString() : null,
          url: signed?.signedUrl ?? null,
        };
      })
    );

    return NextResponse.json({ recordings });
  } catch (e) {
    console.error("[api/recordings/targeted] GET failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * POST /api/recordings/targeted — mark a recording as viewed by the current
 * user. Body: { id }. Only updates the row if the user is an actual viewer
 * (the @@unique([recordingId,userId]) guarantees one row per pair). Idempotent.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = (await req.json().catch(() => ({}))) as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Scope strictly to this user's own viewer row; sets viewedAt only once.
    const result = await prisma.targetedRecordingViewer.updateMany({
      where: { recordingId: id, userId: session.user.id, viewedAt: null },
      data: { viewedAt: new Date() },
    });

    return NextResponse.json({ ok: true, updated: result.count });
  } catch (e) {
    console.error("[api/recordings/targeted] POST failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
