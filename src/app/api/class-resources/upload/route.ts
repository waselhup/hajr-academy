import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { createSupabaseServiceClient } from "@/lib/supabase";
import type { AttachmentKind, ClassResourceCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { detectAttachment, maxBytesFor } from "@/lib/assignments/attachments";
import {
  CLASS_RESOURCE_BUCKET,
  canAccessClassResources,
  isValidCategory,
} from "@/lib/class-resources/resources";

export const dynamic = "force-dynamic";

const VALID_KINDS: AttachmentKind[] = ["VIDEO", "AUDIO", "FILE"];

/**
 * POST /api/class-resources/upload — upload ONE teaching resource into a class
 * the requesting teacher is assigned to. The resource persists with the class.
 *
 * multipart/form-data:
 *   file     — the binary (required)
 *   classId  — target class (required; access-checked server-side)
 *   title    — display title (optional; falls back to the file name)
 *   category — LESSON_PLAN | EXERCISE | SLIDES | OTHER (optional; default OTHER)
 *   kind     — VIDEO | AUDIO | FILE (optional hint; disambiguates webm/mp4)
 *
 * Stored in the private `class-resources` bucket, then a ClassResource row is
 * created. Magic-byte + size validated here. One audit row per upload.
 *
 * Auth: only a TEACHER assigned to the class (or an admin) may upload.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actor = { userId: session.user.id, role: session.user.role };

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const classId = (formData.get("classId") as string | null)?.trim() || "";
    const titleRaw = (formData.get("title") as string | null) ?? "";
    const categoryRaw = (formData.get("category") as string | null) ?? null;
    const declaredKindRaw = (formData.get("kind") as string | null) ?? null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!classId) {
      return NextResponse.json({ error: "Missing classId" }, { status: 400 });
    }

    // Server-side access gate: only an assigned teacher (or admin) may upload.
    if (!(await canAccessClassResources(classId, actor))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const declaredKind: AttachmentKind | null =
      declaredKindRaw && VALID_KINDS.includes(declaredKindRaw as AttachmentKind)
        ? (declaredKindRaw as AttachmentKind)
        : null;

    const category: ClassResourceCategory = isValidCategory(categoryRaw)
      ? categoryRaw
      : "OTHER";

    const buffer = new Uint8Array(await file.arrayBuffer());
    const detected = detectAttachment(buffer, declaredKind, file.type);
    if (!detected) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }

    // Size ceiling depends on media vs document (reused assignment limits).
    const maxBytes = maxBytesFor(detected.kind);
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File too large (max ${Math.round(maxBytes / 1024 / 1024)}MB)` },
        { status: 413 }
      );
    }

    const safeName = (file.name || `resource.${detected.ext}`).slice(0, 160);
    const title = (titleRaw.trim() || safeName).slice(0, 160);

    // Store under the class so a teacher's namespace never collides across classes.
    const path = `${classId}/${crypto.randomUUID()}.${detected.ext}`;
    const supabase = createSupabaseServiceClient();

    const { error: upErr } = await supabase.storage
      .from(CLASS_RESOURCE_BUCKET)
      .upload(path, buffer, { contentType: detected.mime, upsert: false });
    if (upErr) {
      console.error("[api/class-resources/upload] storage error:", upErr.message);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Persist the row (path in `url`; re-signed on demand by the GET endpoint).
    const resource = await prisma.classResource.create({
      data: {
        classId,
        uploadedByUserId: session.user.id,
        kind: detected.kind,
        category,
        title,
        fileName: safeName,
        mimeType: detected.mime,
        sizeBytes: file.size,
        url: path,
      },
      select: {
        id: true,
        kind: true,
        category: true,
        title: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    await audit.mutation(session.user.id, "CLASS_RESOURCE_UPLOADED", "ClassResource", resource.id, {
      classId,
      kind: detected.kind,
      category,
      mime: detected.mime,
      size: file.size,
    });

    return NextResponse.json({ resource });
  } catch (e) {
    console.error("[api/class-resources/upload] failed:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
