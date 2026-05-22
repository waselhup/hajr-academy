/**
 * Upload generated invoice documents to the private `invoices` Supabase
 * bucket and mint signed URLs for download.
 *
 * Path layout: invoices/<year>/<invoiceNumber>.html
 */

import { createClient } from "@supabase/supabase-js";

const BUCKET = "invoices";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Storage object path for an invoice. */
export function invoiceObjectPath(invoiceNumber: string, year: number): string {
  return `${year}/${invoiceNumber}.html`;
}

/**
 * Upload (or overwrite) an invoice document. Returns the storage path.
 * Failures are surfaced to the caller rather than swallowed — the caller
 * decides whether a missing PDF should block the flow.
 */
export async function uploadInvoiceDocument(params: {
  invoiceNumber: string;
  year: number;
  body: Buffer;
}): Promise<{ ok: boolean; path?: string; error?: string }> {
  // Without service-role credentials (local mock) skip the upload quietly.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("[invoice-storage:mock] skipping upload — no service key");
    return { ok: false, error: "no-service-key" };
  }

  const path = invoiceObjectPath(params.invoiceNumber, params.year);
  try {
    const supabase = serviceClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, params.body, {
        contentType: "text/html; charset=utf-8",
        upsert: true,
      });
    if (error) return { ok: false, error: error.message };
    return { ok: true, path };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "upload failed",
    };
  }
}

/** Mint a time-limited signed URL for an uploaded invoice document. */
export async function getInvoiceSignedUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const supabase = serviceClient();
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresInSeconds);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

/** Download a stored invoice document's bytes (for inline serving). */
export async function downloadInvoiceDocument(
  path: string
): Promise<Buffer | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const supabase = serviceClient();
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) return null;
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}
