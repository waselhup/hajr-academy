/**
 * POST /api/library/upload — multipart upload to library-content bucket.
 * Returns { ok, publicUrl } so the client can persist into LibraryItem.contentUrl
 * or LibraryItem.thumbnailUrl. Admin & Teacher only.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import {
  uploadLibraryContent,
  detectMime,
  LIBRARY_MAX_SIZE,
} from "@/lib/storage/library-storage";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "audio/mpeg",
]);

export async function POST(req: NextRequest) {
  const session = await requireRole("ADMIN", "SUPER_ADMIN", "TEACHER");
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, error: "multipart required" }, { status: 400 });
  }
  const file = form.get("file");
  const kind = (form.get("kind") as string | null) ?? "content";
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });
  }
  if (file.size > LIBRARY_MAX_SIZE) {
    return NextResponse.json({ ok: false, error: "file too large (max 50 MB)" }, { status: 413 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = detectMime(buffer);
  if (!sniffed || !ALLOWED_MIMES.has(sniffed)) {
    return NextResponse.json(
      { ok: false, error: "unsupported file type" },
      { status: 415 }
    );
  }
  const ext = sniffed.split("/")[1].replace("jpeg", "jpg");
  const path = `${session.user.id}/${kind}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const res = await uploadLibraryContent({ path, body: buffer, contentType: sniffed });
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error ?? "upload failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, publicUrl: res.publicUrl, path });
}
