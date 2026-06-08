import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createSupabaseServiceClient } from "@/lib/supabase";
import {
  detectRecordedMedia,
  extForMime,
  RECORDED_MEDIA_MIMES,
  type RecordingKind,
} from "@/lib/media/recording-mime";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB for images/docs
// Recorded audio/video can be larger; mirrors the assignment-media media cap.
const MAX_MEDIA_BYTES = 25 * 1024 * 1024; // 25 MB for audio/video

const MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
};

const IMG_DOC_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function detectMime(buffer: Uint8Array): string | null {
  for (const [mime, bytes] of Object.entries(MAGIC_BYTES)) {
    if (bytes.every((b, i) => buffer[i] === b)) return mime;
  }
  return null;
}

/**
 * POST /api/messages/upload — upload a chat attachment.
 *
 * multipart/form-data with a `file` field. Validates size (≤5 MB) and
 * type by magic bytes, stores it in the private `chat-attachments`
 * bucket, and returns a long-lived signed URL.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    // Recorder hint: "AUDIO" | "VIDEO" disambiguates the shared webm header.
    const kindHint = (formData.get("kind") as string | null)?.toUpperCase() ?? null;
    const durationRaw = (formData.get("durationSec") as string | null) ?? null;
    // The real container mime the recorder produced (and already previewed).
    // Used ONLY as a fallback for the recorder path — see below.
    const declaredMime = ((formData.get("declaredMime") as string | null) ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const isRecording = kindHint === "AUDIO" || kindHint === "VIDEO";
    const buffer = new Uint8Array(await file.arrayBuffer());

    // Detect: images/docs by magic bytes; recorded audio/video (webm | mp4 | ogg)
    // by container header + the recorder's AUDIO|VIDEO hint.
    let mime = detectMime(buffer);
    if (!mime && isRecording) {
      mime = detectRecordedMedia(buffer, kindHint as RecordingKind);
    }
    // Defense in depth for the recorder path ONLY: iOS Safari fragmented-MP4
    // audio doesn't always present a clean brand box where the sniffer looks.
    // If sniffing came back null but the browser told us it's a recognised
    // recorded-media container, trust that — the client captured + previewed it.
    // This never applies to image/PDF uploads (no AUDIO/VIDEO hint), so those
    // still must pass the strict magic-byte check.
    if (!mime && isRecording && RECORDED_MEDIA_MIMES.has(declaredMime)) {
      mime = declaredMime;
    }
    if (!mime) {
      return NextResponse.json(
        { error: "Unsupported file type (PNG, JPEG, WEBP, PDF, audio/video only)" },
        { status: 415 }
      );
    }

    // Recorded media gets a higher ceiling than images/docs.
    const isMedia = RECORDED_MEDIA_MIMES.has(mime);
    const cap = isMedia ? MAX_MEDIA_BYTES : MAX_BYTES;
    if (file.size > cap) {
      return NextResponse.json(
        { error: `File too large (max ${Math.round(cap / 1024 / 1024)}MB)` },
        { status: 413 }
      );
    }

    // Optional recorded duration (purely informational; stored in audit only).
    let durationSec: number | null = null;
    if (durationRaw != null && durationRaw !== "") {
      const d = Math.round(Number(durationRaw));
      if (Number.isFinite(d) && d >= 0) durationSec = d;
    }

    const ext = IMG_DOC_EXT[mime] ?? extForMime(mime);
    const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
    const supabase = createSupabaseServiceClient();

    const { error: upErr } = await supabase.storage
      .from("chat-attachments")
      .upload(path, buffer, { contentType: mime, upsert: false });
    if (upErr) {
      console.error("[api/messages/upload] storage error:", upErr.message);
      return NextResponse.json(
        { error: "Upload failed" },
        { status: 500 }
      );
    }

    // Private bucket → signed URL valid for one year.
    const { data: signed, error: signErr } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !signed) {
      return NextResponse.json(
        { error: "Could not sign attachment URL" },
        { status: 500 }
      );
    }

    await logAudit({
      userId: session.user.id,
      action: "CHAT_ATTACHMENT_UPLOADED",
      entity: "Message",
      metadata: { path, mime, size: file.size, durationSec },
    });

    // Keep the original filename for display; cap its length.
    const safeName = (file.name || `attachment.${ext}`).slice(0, 120);
    return NextResponse.json({
      attachment: {
        url: signed.signedUrl,
        path,
        name: safeName,
        type: mime,
        size: file.size,
      },
    });
  } catch (e) {
    console.error("[api/messages/upload] failed:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
