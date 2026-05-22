import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createSupabaseServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
};

const EXT_MAP: Record<string, string> = {
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
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 413 }
      );
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const mime = detectMime(buffer);
    if (!mime) {
      return NextResponse.json(
        { error: "Unsupported file type (PNG, JPEG, WEBP, PDF only)" },
        { status: 415 }
      );
    }

    const ext = EXT_MAP[mime];
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
      metadata: { path, mime, size: file.size },
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
