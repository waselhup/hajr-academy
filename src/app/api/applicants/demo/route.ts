import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notify";
import { createClient } from "@supabase/supabase-js";
import { APPLICANT_DEMO_BUCKET, DEMO_MAX_BYTES } from "@/lib/applicants/service";

export const dynamic = "force-dynamic";

/**
 * Video magic-byte sniffing for the common recorder/container formats.
 * Mirrors the teacher voice-intro route's approach (signature, not extension).
 */
function detectVideoMime(b: Uint8Array): string | null {
  // WebM / Matroska: 1A 45 DF A3
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
  // MP4 / MOV / M4V: "....ftyp"
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    // brand bytes (8..12) distinguish qt vs mp4; both acceptable.
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (brand.startsWith("qt")) return "video/quicktime";
    return "video/mp4";
  }
  // OGG (Theora): "OggS"
  if (b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) return "video/ogg";
  return null;
}

const EXT_MAP: Record<string, string> = {
  "video/webm": "webm",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/ogg": "ogv",
};

/**
 * POST /api/applicants/demo — upload a recorded demo lesson to the private
 * `applicant-demos` bucket (mirrors teacher-applications storage). Multipart:
 * { file }. Returns the storage path + a short-lived signed URL. Only the
 * signed-in APPLICANT (with the DEMO_RECORDING feature enabled) may upload.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "APPLICANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const applicant = await prisma.applicantProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, fullName: true, isReadOnly: true },
    });
    if (!applicant) {
      return NextResponse.json({ error: "No applicant profile" }, { status: 403 });
    }
    if (applicant.isReadOnly) {
      return NextResponse.json({ error: "Account is read-only" }, { status: 403 });
    }

    // Feature gate — DEMO_RECORDING must be enabled for this applicant.
    const access = await prisma.applicantFeatureAccess.findUnique({
      where: { applicantId_feature: { applicantId: applicant.id, feature: "DEMO_RECORDING" } },
      select: { enabled: true },
    });
    if (!access?.enabled) {
      return NextResponse.json({ error: "Feature not available" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (file.size > DEMO_MAX_BYTES) {
      return NextResponse.json({ error: "Video too large" }, { status: 413 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const mime = detectVideoMime(buffer.subarray(0, 16));
    if (!mime) {
      return NextResponse.json({ error: "Unsupported video format" }, { status: 415 });
    }

    const ext = EXT_MAP[mime];
    const path = `${applicant.id}/${crypto.randomUUID()}.${ext}`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.storage
      .from(APPLICANT_DEMO_BUCKET)
      .upload(path, buffer, { contentType: mime, upsert: false });

    if (error) {
      return NextResponse.json({ error: "Upload failed: " + error.message }, { status: 500 });
    }

    const { data: signed } = await supabase.storage
      .from(APPLICANT_DEMO_BUCKET)
      .createSignedUrl(path, 3600);

    await audit.mutation(session.user.id, "APPLICANT_DEMO_UPLOADED", "ApplicantProfile", applicant.id, {
      path,
      mime,
      size: file.size,
    });

    // Let admins know a demo arrived. Best-effort.
    try {
      await notifyAdmins({
        type: "SYSTEM_ANNOUNCEMENT",
        title: `Demo lesson uploaded: ${applicant.fullName}`,
        titleAr: `تم رفع درس تجريبي: ${applicant.fullName}`,
        body: `${applicant.fullName} uploaded a recorded demo lesson.`,
        bodyAr: `رفع ${applicant.fullName} درساً تجريبياً مسجّلاً.`,
        channels: ["inApp"],
        actionUrl: `/admin/applicants/${applicant.id}`,
        refType: "ApplicantProfile",
        refId: applicant.id,
      });
    } catch (e) {
      console.error("[applicants/demo] admin notify failed (non-fatal):", e);
    }

    return NextResponse.json({ path, signedUrl: signed?.signedUrl ?? null, mime });
  } catch (e) {
    console.error("[api/applicants/demo] failed:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
