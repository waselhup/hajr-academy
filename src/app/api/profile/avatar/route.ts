/**
 * Universal profile photo (generalized from the teacher-only route).
 *
 * POST   /api/profile/avatar  (multipart: file) — any authenticated user sets
 *        their OWN photo.
 * DELETE /api/profile/avatar  — clears the photo (back to initials).
 *
 *   - Validates the image by MAGIC BYTES (png/jpeg/webp/gif), not just the
 *     declared MIME, and caps size at 5 MB.
 *   - Stores in the PUBLIC `avatars` bucket and saves the public URL to
 *     User.avatar so it renders everywhere the avatar already shows (top-right
 *     corner, class card, public profile, rosters) with no signed-URL churn.
 *   - Audited via the generic AVATAR_UPDATED / AVATAR_REMOVED actions.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const AVATAR_BUCKET = "avatars";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Image magic-byte check — returns {mime, ext} or null. */
function detectImage(b: Uint8Array): { mime: string; ext: string } | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return { mime: "image/png", ext: "png" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return { mime: "image/jpeg", ext: "jpg" };
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  )
    return { mime: "image/webp", ext: "webp" };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38)
    return { mime: "image/gif", ext: "gif" };
  return null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Any authenticated user may set their own photo — no role allowlist.

  try {
    const formData = await req.formData();

    // Optional remove flag, so a single multipart POST can also clear the photo.
    if (formData.get("remove") === "true") {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { avatar: null },
      });
      await logAudit({
        userId: session.user.id,
        action: "AVATAR_REMOVED",
        entity: "User",
        entityId: session.user.id,
      });
      return NextResponse.json({ ok: true, avatar: null });
    }

    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const detected = detectImage(buffer);
    if (!detected) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
    }

    const path = `${session.user.id}/${crypto.randomUUID()}.${detected.ext}`;
    const supabase = createSupabaseServiceClient();
    const { error: upErr } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, buffer, { contentType: detected.mime, upsert: false });
    if (upErr) {
      console.error("[api/profile/avatar] storage error:", upErr.message);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const avatarUrl = pub.publicUrl;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: avatarUrl },
    });

    await logAudit({
      userId: session.user.id,
      action: "AVATAR_UPDATED",
      entity: "User",
      entityId: session.user.id,
      metadata: { path, mime: detected.mime, size: file.size },
    });

    return NextResponse.json({ ok: true, avatar: avatarUrl });
  } catch (e) {
    console.error("[api/profile/avatar] failed:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: null },
    });
    await logAudit({
      userId: session.user.id,
      action: "AVATAR_REMOVED",
      entity: "User",
      entityId: session.user.id,
    });
    return NextResponse.json({ ok: true, avatar: null });
  } catch (e) {
    console.error("[api/profile/avatar] remove failed:", e);
    return NextResponse.json({ error: "Remove failed" }, { status: 500 });
  }
}
