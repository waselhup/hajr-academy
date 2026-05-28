/**
 * Library content bucket helper (Sprint 7A).
 * Mirrors the sprint4-storage.ts pattern but for the `library-content` bucket.
 * Returns mock results when the service role key is absent.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "library-content";

function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function uploadLibraryContent(params: {
  path: string;
  body: Buffer;
  contentType: string;
}): Promise<{ ok: boolean; path?: string; publicUrl?: string; error?: string }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "no-service-key" };
  }
  try {
    const supabase = serviceClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(params.path, params.body, {
        contentType: params.contentType,
        upsert: true,
      });
    if (error) return { ok: false, error: error.message };
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    return {
      ok: true,
      path: params.path,
      publicUrl: `${base}/storage/v1/object/public/${BUCKET}/${params.path}`,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "upload failed",
    };
  }
}

export function getLibraryPublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

/**
 * Magic-byte sniffing to validate uploaded file types.
 * Matches the pattern Sprint 5 blackboard uses.
 */
export function detectMime(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47)
    return "image/png";
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return "image/gif";
  // WebP: starts RIFF and contains WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  )
    return "image/webp";
  // PDF: 25 50 44 46
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46)
    return "application/pdf";
  // MP4 / MOV: ftyp (offset 4)
  if (buffer.length >= 8 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70)
    return "video/mp4";
  // MP3: ID3 or FF FB / FF F3 / FF F2
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return "audio/mpeg";
  if (buffer[0] === 0xff && (buffer[1] === 0xfb || buffer[1] === 0xf3 || buffer[1] === 0xf2))
    return "audio/mpeg";
  return null;
}

export const LIBRARY_MAX_SIZE = 50 * 1024 * 1024; // 50 MB
