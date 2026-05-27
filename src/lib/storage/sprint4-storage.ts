/**
 * Generic Supabase storage helper for Sprint 4 buckets:
 *   - parent-reports (private, signed URLs)
 *   - certificates   (public, permanent URLs)
 *   - share-images   (public, permanent URLs)
 *
 * Mirrors the invoice-storage pattern but parameterised on bucket.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type Sprint4Bucket = "parent-reports" | "certificates" | "share-images";

function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function uploadToBucket(params: {
  bucket: Sprint4Bucket;
  path: string;
  body: Buffer;
  contentType: string;
}): Promise<{ ok: boolean; path?: string; error?: string }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "no-service-key" };
  }
  try {
    const supabase = serviceClient();
    const { error } = await supabase.storage
      .from(params.bucket)
      .upload(params.path, params.body, {
        contentType: params.contentType,
        upsert: true,
      });
    if (error) return { ok: false, error: error.message };
    return { ok: true, path: params.path };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "upload failed",
    };
  }
}

export async function getSignedUrl(
  bucket: Sprint4Bucket,
  path: string,
  expiresInSeconds = 60 * 60 * 24 * 365
): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const supabase = serviceClient();
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

export function getPublicUrl(bucket: Sprint4Bucket, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export async function downloadFromBucket(
  bucket: Sprint4Bucket,
  path: string
): Promise<Buffer | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const supabase = serviceClient();
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) return null;
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}
