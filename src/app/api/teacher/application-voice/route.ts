import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { VOICE_BUCKET, VOICE_MAX_BYTES } from "@/lib/openings/service";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Audio magic-byte signatures. Browser recorders typically produce
 * webm/ogg/mp4; mp3 covers other recorder output. (Mirrors the lab route.)
 */
function detectAudioMime(b: Uint8Array): string | null {
  // WebM / Matroska: 1A 45 DF A3
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) {
    return "audio/webm";
  }
  // OGG: "OggS"
  if (b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) {
    return "audio/ogg";
  }
  // WAV: "RIFF" .... "WAVE"
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x41 && b[10] === 0x56 && b[11] === 0x45
  ) {
    return "audio/wav";
  }
  // MP3: ID3 tag ("ID3") or frame sync (0xFF 0xFB/0xF3/0xF2)
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return "audio/mpeg";
  if (b[0] === 0xff && (b[1] === 0xfb || b[1] === 0xf3 || b[1] === 0xf2)) {
    return "audio/mpeg";
  }
  // MP4 / M4A: "....ftyp"
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    return "audio/mp4";
  }
  return null;
}

const EXT_MAP: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
};

/**
 * POST /api/teacher/application-voice — upload the optional 1-minute voice
 * intro for a teacher's program application.
 * Multipart form: { file }
 * Stored in the private `teacher-applications` bucket; returns the storage
 * `path` (the apply form stores the path as voiceIntroUrl so admin can
 * re-sign it later) plus a short-lived signed URL for immediate playback.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!teacherProfile) {
      return NextResponse.json({ error: "No teacher profile" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    if (file.size > VOICE_MAX_BYTES) {
      return NextResponse.json(
        { error: "Audio too large" },
        { status: 413 }
      );
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const mime = detectAudioMime(buffer);
    if (!mime) {
      return NextResponse.json(
        { error: "Unsupported audio format" },
        { status: 415 }
      );
    }

    const ext = EXT_MAP[mime];
    const path = `${teacherProfile.id}/${crypto.randomUUID()}.${ext}`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.storage
      .from(VOICE_BUCKET)
      .upload(path, buffer, { contentType: mime, upsert: false });

    if (error) {
      return NextResponse.json(
        { error: "Upload failed: " + error.message },
        { status: 500 }
      );
    }

    // Private bucket — return a signed URL valid for 1 hour for playback.
    const { data: signed } = await supabase.storage
      .from(VOICE_BUCKET)
      .createSignedUrl(path, 3600);

    await logAudit({
      userId: session.user.id,
      action: "TEACHER_APPLICATION_VOICE_UPLOADED",
      entity: "TeacherApplication",
      entityId: null,
      metadata: { path, mime, size: file.size },
    });

    return NextResponse.json({
      path,
      signedUrl: signed?.signedUrl ?? null,
      mime,
    });
  } catch (e) {
    console.error("[api/teacher/application-voice] failed:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
