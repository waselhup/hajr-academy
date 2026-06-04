import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { isAdminish } from "@/lib/rbac";
import { createSupabaseServiceClient } from "@/lib/supabase";
import {
  TARGETED_RECORDINGS_BUCKET,
  MAX_TARGETED_VIDEO_BYTES,
  detectVideo,
  ensureTargetedBucket,
} from "@/lib/recordings/targeted";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/targeted-recordings/upload — admin uploads a video FOR a
 * hand-picked set of users.
 *
 * multipart/form-data:
 *   file        — the video binary (required, video/* validated by magic bytes)
 *   title       — display title (required)
 *   titleAr     — Arabic title (optional)
 *   description — optional notes
 *   userIds     — JSON array of target user ids (required, ≥1)
 *
 * Stores the binary in the PRIVATE `targeted-recordings` bucket under the
 * uploading admin's id, creates a TargetedRecording row + one
 * TargetedRecordingViewer per selected user, and notifies each viewer. Only
 * the storage PATH is persisted; playback URLs are signed on demand.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminish(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = ((formData.get("title") as string | null) ?? "").trim();
    const titleAr = ((formData.get("titleAr") as string | null) ?? "").trim();
    const description = ((formData.get("description") as string | null) ?? "").trim();
    const descriptionAr = ((formData.get("descriptionAr") as string | null) ?? "").trim();
    const userIdsRaw = (formData.get("userIds") as string | null) ?? "[]";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (title.length < 2) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let userIds: string[] = [];
    try {
      const parsed = JSON.parse(userIdsRaw);
      if (Array.isArray(parsed)) {
        userIds = [...new Set(parsed.filter((x): x is string => typeof x === "string" && x.length > 0))];
      }
    } catch {
      return NextResponse.json({ error: "Invalid userIds" }, { status: 400 });
    }
    if (userIds.length === 0) {
      return NextResponse.json({ error: "Select at least one viewer" }, { status: 400 });
    }

    // Only keep ids that resolve to real, active users.
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { id: true },
    });
    const validIds = users.map((u) => u.id);
    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid viewers" }, { status: 400 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const detected = detectVideo(buffer, file.type);
    if (!detected) {
      return NextResponse.json(
        { error: "Unsupported file type (video only)" },
        { status: 415 }
      );
    }
    if (file.size > MAX_TARGETED_VIDEO_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${Math.round(MAX_TARGETED_VIDEO_BYTES / 1024 / 1024)}MB)` },
        { status: 413 }
      );
    }

    // Optional recorded/known duration.
    let durationSec: number | null = null;
    const durationRaw = (formData.get("durationSec") as string | null) ?? null;
    if (durationRaw != null && durationRaw !== "") {
      const d = Math.round(Number(durationRaw));
      if (Number.isFinite(d) && d >= 0) durationSec = d;
    }

    const supabase = createSupabaseServiceClient();
    await ensureTargetedBucket(supabase);

    const path = `${session.user.id}/${crypto.randomUUID()}.${detected.ext}`;
    const { error: upErr } = await supabase.storage
      .from(TARGETED_RECORDINGS_BUCKET)
      .upload(path, buffer, { contentType: detected.mime, upsert: false });
    if (upErr) {
      console.error("[api/admin/targeted-recordings/upload] storage error:", upErr.message);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Persist the recording + viewer rows in one transaction.
    const recording = await prisma.targetedRecording.create({
      data: {
        title,
        titleAr: titleAr || null,
        description: description || null,
        descriptionAr: descriptionAr || null,
        storagePath: path,
        mimeType: detected.mime,
        sizeBytes: file.size,
        durationSec,
        uploadedById: session.user.id,
        viewers: {
          create: validIds.map((userId) => ({ userId })),
        },
      },
      select: { id: true },
    });

    await logAudit({
      userId: session.user.id,
      action: "TARGETED_RECORDING_UPLOADED",
      entity: "TargetedRecording",
      entityId: recording.id,
      metadata: { path, mime: detected.mime, size: file.size, viewers: validIds.length },
    });

    // Notify each viewer (best-effort; failures never block the response).
    await Promise.allSettled(
      validIds.map((userId) =>
        notify({
          userId,
          type: "SYSTEM_ANNOUNCEMENT",
          title: "A recording was shared with you",
          titleAr: "تمت مشاركة تسجيل معك",
          body: title,
          bodyAr: titleAr || title,
          channels: ["inApp"],
          actionUrl: "/recordings",
          refType: "TargetedRecording",
          refId: recording.id,
        })
      )
    );

    return NextResponse.json({ ok: true, id: recording.id, viewers: validIds.length });
  } catch (e) {
    console.error("[api/admin/targeted-recordings/upload] failed:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
