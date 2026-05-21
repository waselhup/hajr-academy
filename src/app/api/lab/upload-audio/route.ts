import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

/**
 * Audio magic-byte signatures. Browser recorders typically produce
 * webm/ogg/mp4; mp3 covers mic-recorder-to-mp3 output.
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
 * POST /api/lab/upload-audio — upload a speaking submission recording.
 * Multipart form: { file, attemptId }
 * Stored in the private `lab-audio` bucket; returns the storage path.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!student) {
      return NextResponse.json({ error: "No student profile" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const attemptId = formData.get("attemptId") as string | null;
    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Audio too large (max 25MB)" },
        { status: 413 }
      );
    }

    // Verify the attempt belongs to this student, if one was given.
    if (attemptId) {
      const attempt = await prisma.labAttempt.findUnique({
        where: { id: attemptId },
        select: { studentId: true },
      });
      if (!attempt || attempt.studentId !== student.id) {
        return NextResponse.json({ error: "Invalid attempt" }, { status: 403 });
      }
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
    const fileId = crypto.randomUUID();
    const path = `${student.id}/${fileId}.${ext}`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.storage
      .from("lab-audio")
      .upload(path, buffer, { contentType: mime, upsert: false });

    if (error) {
      return NextResponse.json(
        { error: "Upload failed: " + error.message },
        { status: 500 }
      );
    }

    // Private bucket — return a signed URL valid for 1 hour for playback.
    const { data: signed } = await supabase.storage
      .from("lab-audio")
      .createSignedUrl(path, 3600);

    await logAudit({
      userId: session.user.id,
      action: "LAB_AUDIO_UPLOADED",
      entity: "LabAttempt",
      entityId: attemptId ?? null,
      metadata: { path, mime, size: file.size },
    });

    return NextResponse.json({
      path,
      signedUrl: signed?.signedUrl ?? null,
      mime,
    });
  } catch (e) {
    console.error("[api/lab/upload-audio] failed:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
