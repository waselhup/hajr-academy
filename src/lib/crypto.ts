// AES-256-GCM encryption for secrets we must store in the DB (e.g. a Zoom
// account's Server-to-Server OAuth client secret). The key comes from the
// ENCRYPTION_KEY env var; any sufficiently-random string works — it's hashed
// to a 32-byte key, so the owner can paste a long random passphrase in Vercel.
//
// Only used when a Zoom account stores its OWN credentials. Accounts that reuse
// the global Zoom connection (host-email only) never need a secret or this key.
import crypto from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = (process.env.ENCRYPTION_KEY ?? "").trim();
  if (!raw) throw new Error("ENCRYPTION_KEY_NOT_SET");
  // Accept a 32-byte base64 / hex key directly; otherwise derive one via SHA-256
  // so any long passphrase is acceptable.
  try {
    const b64 = Buffer.from(raw, "base64");
    if (b64.length === 32) return b64;
  } catch {
    /* fall through */
  }
  const hex = Buffer.from(raw, "hex");
  if (hex.length === 32) return hex;
  return crypto.createHash("sha256").update(raw).digest();
}

/** Encrypt a plaintext secret -> "iv:tag:ciphertext" (all base64). */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

/** Reverse encryptSecret(). Throws if the blob is malformed or the key is wrong. */
export function decryptSecret(blob: string): string {
  const [ivB, tagB, dataB] = blob.split(":");
  if (!ivB || !tagB || !dataB) throw new Error("BAD_CIPHERTEXT");
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** True when ENCRYPTION_KEY is set (so per-account secrets can be stored). */
export function isEncryptionConfigured(): boolean {
  return !!(process.env.ENCRYPTION_KEY ?? "").trim();
}
