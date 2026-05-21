import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { createClient } from "@supabase/supabase-js";

const MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
};

function detectMime(buffer: Uint8Array): string | null {
  for (const [mime, bytes] of Object.entries(MAGIC_BYTES)) {
    if (bytes.every((b, i) => buffer[i] === b)) return mime;
  }
  return null;
}

const EXT_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const room = await prisma.blackboardRoom.findUnique({
    where: { id: params.roomId },
    include: { permissions: { where: { revokedAt: null } } },
  });
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = session.user.id;
  const role = session.user.role;
  const isHost = role === "TEACHER" || role === "SUPER_ADMIN" || role === "ADMIN";

  if (!isHost) {
    const student = await prisma.studentProfile.findUnique({ where: { userId } });
    const canEdit =
      room.allowStudentEdit ||
      (student && room.permissions.some((p) => p.studentId === student.id));
    if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 });
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const detectedMime = detectMime(buffer);
  if (!detectedMime) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 415 });
  }

  const ext = EXT_MAP[detectedMime];
  const fileId = crypto.randomUUID();
  const path = `${params.roomId}/${fileId}.${ext}`;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.storage
    .from("blackboards")
    .upload(path, buffer, { contentType: detectedMime, upsert: false });

  if (error) {
    return NextResponse.json({ error: "Upload failed: " + error.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("blackboards").getPublicUrl(path);

  await logAudit({
    userId,
    action: "BLACKBOARD_ASSET_UPLOADED",
    entity: "BlackboardRoom",
    entityId: params.roomId,
    metadata: { path, mime: detectedMime, size: file.size },
  });

  return NextResponse.json({
    url: urlData.publicUrl,
    type: detectedMime.startsWith("image/") ? "image" : "pdf",
    dimensions: null,
  });
}
