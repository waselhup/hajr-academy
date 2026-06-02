import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createSupabaseServiceClient } from "@/lib/supabase";
import type { AttachmentKind } from "@prisma/client";
import {
  ASSIGNMENT_BUCKET,
  detectAttachment,
  maxBytesFor,
  MAX_VIDEO_SEC,
  MAX_VOICE_SEC,
} from "@/lib/assignments/attachments";

export const dynamic = "force-dynamic";

const VALID_KINDS: AttachmentKind[] = ["VIDEO", "AUDIO", "TEXT", "FILE"];

/**
 * POST /api/assignments/upload — upload ONE attachment for an assignment
 * (teacher material) or a submission response (student).
 *
 * multipart/form-data:
 *   file        — the binary (required)
 *   kind        — VIDEO | AUDIO | FILE (optional hint; disambiguates webm/mp4)
 *   durationSec — recorded length for VIDEO/AUDIO (optional, validated)
 *
 * Stored in the private `assignment-media` bucket under the uploader's user
 * id. Returns the storage `path` + a short-lived signed URL for immediate
 * preview. The path is what callers persist; it is re-signed on demand by
 * the access-controlled GET endpoint. Magic-byte + size validated here.
 *
 * Auth: any TEACHER, STUDENT, or admin may upload to their own namespace.
 * Whether a given upload may then be ATTACHED to a specific assignment /
 * submission is enforced when the attachment row is created (server action).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (!["TEACHER", "STUDENT", "ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const declaredKindRaw = (formData.get("kind") as string | null) ?? null;
    const durationRaw = (formData.get("durationSec") as string | null) ?? null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const declaredKind: AttachmentKind | null =
      declaredKindRaw && VALID_KINDS.includes(declaredKindRaw as AttachmentKind)
        ? (declaredKindRaw as AttachmentKind)
        : null;

    const buffer = new Uint8Array(await file.arrayBuffer());
    const detected = detectAttachment(buffer, declaredKind, file.type);
    if (!detected) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 415 }
      );
    }

    // Size ceiling depends on media vs document.
    const maxBytes = maxBytesFor(detected.kind);
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File too large (max ${Math.round(maxBytes / 1024 / 1024)}MB)` },
        { status: 413 }
      );
    }

    // Validate recorded duration server-side (defensive; UI also caps).
    let durationSec: number | null = null;
    if (durationRaw != null && durationRaw !== "") {
      const d = Math.round(Number(durationRaw));
      if (Number.isFinite(d) && d >= 0) durationSec = d;
    }
    if (durationSec != null) {
      const cap = detected.kind === "VIDEO" ? MAX_VIDEO_SEC : detected.kind === "AUDIO" ? MAX_VOICE_SEC : null;
      if (cap != null && durationSec > cap + 2 /* small tolerance */) {
        return NextResponse.json(
          { error: "Recording exceeds the allowed length" },
          { status: 413 }
        );
      }
    }

    const path = `${session.user.id}/${crypto.randomUUID()}.${detected.ext}`;
    const supabase = createSupabaseServiceClient();

    const { error: upErr } = await supabase.storage
      .from(ASSIGNMENT_BUCKET)
      .upload(path, buffer, { contentType: detected.mime, upsert: false });
    if (upErr) {
      console.error("[api/assignments/upload] storage error:", upErr.message);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Private bucket → short-lived signed URL for immediate preview.
    const { data: signed } = await supabase.storage
      .from(ASSIGNMENT_BUCKET)
      .createSignedUrl(path, 3600);

    // One audit row per upload.
    await logAudit({
      userId: session.user.id,
      action: "ASSIGNMENT_ATTACHMENT_UPLOADED",
      entity: "AssignmentAttachment",
      entityId: null,
      metadata: { path, kind: detected.kind, mime: detected.mime, size: file.size, durationSec },
    });

    const safeName = (file.name || `attachment.${detected.ext}`).slice(0, 160);
    return NextResponse.json({
      attachment: {
        kind: detected.kind,
        path,
        url: signed?.signedUrl ?? null,
        fileName: safeName,
        mimeType: detected.mime,
        sizeBytes: file.size,
        durationSec,
      },
    });
  } catch (e) {
    console.error("[api/assignments/upload] failed:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
