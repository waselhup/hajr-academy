import crypto from "crypto";

/**
 * Verify a Zoom webhook request using HMAC-SHA256.
 * Zoom signs: `v0:${timestamp}:${rawBody}` with the webhook secret token,
 * then sends `x-zm-signature: v0=<hex>` and `x-zm-request-timestamp`.
 */
export function verifyZoomWebhook(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secretToken: string
): boolean {
  if (!signature || !timestamp || !secretToken) return false;
  const message = `v0:${timestamp}:${rawBody}`;
  const hash = crypto.createHmac("sha256", secretToken).update(message).digest("hex");
  const expected = `v0=${hash}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Build the response for Zoom's `endpoint.url_validation` challenge.
 * Zoom sends a plainToken; we return it plus its HMAC-SHA256 hex digest.
 */
export function buildUrlValidationResponse(plainToken: string, secretToken: string) {
  const encryptedToken = crypto
    .createHmac("sha256", secretToken)
    .update(plainToken)
    .digest("hex");
  return { plainToken, encryptedToken };
}
