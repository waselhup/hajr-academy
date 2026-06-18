"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { encryptSecret, decryptSecret, isEncryptionConfigured } from "@/lib/crypto";

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0] ?? null;
}

const ZOOM_OAUTH = "https://zoom.us/oauth/token";

const createSchema = z.object({
  label: z.string().min(1).max(60),
  hostEmail: z.string().email(),
  capacity: z.coerce.number().int().min(1).max(50).optional(),
  // Optional per-account Server-to-Server OAuth keys (separate Zoom login).
  // All three together, or none (reuse the global env connection).
  accountId: z.string().trim().optional(),
  clientId: z.string().trim().optional(),
  clientSecret: z.string().trim().optional(),
});

const updateSchema = createSchema.extend({ id: z.string() });

/** Some / all / none of the three S2S fields were provided. */
function credsState(d: { accountId?: string; clientId?: string; clientSecret?: string }) {
  const has = [d.accountId, d.clientId, d.clientSecret].filter((v) => v && v.length > 0).length;
  return { none: has === 0, all: has === 3, partial: has > 0 && has < 3 };
}

/** Real Zoom check: S2S OAuth token + confirm the host email exists on the account. */
async function testZoom(
  creds: { accountId: string; clientId: string; clientSecret: string },
  hostEmail: string
): Promise<{ ok: boolean; message: string; accountEmail?: string; plan?: string }> {
  if (!creds.accountId || !creds.clientId || !creds.clientSecret) {
    return { ok: false, message: "Zoom credentials are not configured." };
  }
  try {
    const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
    const tokenRes = await fetch(
      `${ZOOM_OAUTH}?grant_type=account_credentials&account_id=${creds.accountId}`,
      { method: "POST", headers: { Authorization: `Basic ${basic}` } }
    );
    if (!tokenRes.ok) return { ok: false, message: `Sign-in to Zoom failed (${tokenRes.status}). Check the keys.` };
    const tok = (await tokenRes.json()) as { access_token: string; api_url?: string };
    const base = (tok.api_url ?? "https://api.zoom.us").replace(/\/+$/, "");
    const meRes = await fetch(`${base}/v2/users/${encodeURIComponent(hostEmail)}`, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    if (meRes.status === 404) return { ok: false, message: `Host "${hostEmail}" is not a user on this Zoom account.` };
    if (!meRes.ok) return { ok: false, message: `Host check failed (${meRes.status}).` };
    const me = (await meRes.json()) as { email?: string; type?: number };
    return {
      ok: true,
      message: "Connection OK.",
      accountEmail: me.email,
      plan: me.type === 2 ? "Licensed / Pro" : me.type === 1 ? "Basic" : "Other",
    };
  } catch (e) {
    return { ok: false, message: (e as Error).message || "Network error reaching Zoom." };
  }
}

export async function createZoomAccountAction(
  input: z.infer<typeof createSchema>
): Promise<Result<{ id: string }>> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "VALIDATION: " + parsed.error.issues.map((i) => i.message).join(", ") };
  const d = parsed.data;
  const cs = credsState(d);
  if (cs.partial) return { ok: false, error: "Enter ALL three Zoom keys (Account ID, Client ID, Client Secret) or leave all three blank." };
  if (cs.all && !isEncryptionConfigured())
    return { ok: false, error: "Set the ENCRYPTION_KEY environment variable before saving a Zoom account's own keys." };

  try {
    const account = await prisma.zoomAccount.create({
      data: {
        label: d.label,
        hostEmail: d.hostEmail,
        capacity: d.capacity ?? 6,
        accountId: cs.all ? d.accountId : null,
        clientId: cs.all ? d.clientId : null,
        clientSecretEnc: cs.all ? encryptSecret(d.clientSecret!) : null,
      },
    });
    await logAudit({
      userId: session.user.id, action: "ZOOM_ACCOUNT_CREATED", entity: "ZoomAccount",
      entityId: account.id, metadata: { label: d.label, ownCreds: cs.all }, ipAddress: await ip(),
    });
    revalidatePath("/admin/zoom-accounts");
    return { ok: true, data: { id: account.id } };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "DB_ERROR" };
  }
}

export async function updateZoomAccountAction(input: z.infer<typeof updateSchema>): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const { id, ...d } = parsed.data;
  const cs = credsState(d);
  if (cs.partial) return { ok: false, error: "Enter ALL three Zoom keys or leave all three blank." };

  const data: Record<string, unknown> = {
    label: d.label,
    hostEmail: d.hostEmail,
    capacity: d.capacity ?? 6,
  };
  // Only touch credential columns when the admin supplied keys this time.
  if (cs.all) {
    if (!isEncryptionConfigured())
      return { ok: false, error: "Set the ENCRYPTION_KEY environment variable before saving a Zoom account's own keys." };
    data.accountId = d.accountId;
    data.clientId = d.clientId;
    data.clientSecretEnc = encryptSecret(d.clientSecret!);
  }
  try {
    await prisma.zoomAccount.update({ where: { id }, data });
    await logAudit({ userId: session.user.id, action: "ZOOM_ACCOUNT_UPDATED", entity: "ZoomAccount", entityId: id, metadata: { label: d.label }, ipAddress: await ip() });
    revalidatePath("/admin/zoom-accounts");
    return { ok: true, data: null };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "DB_ERROR" };
  }
}

export async function toggleZoomAccountActiveAction(id: string): Promise<Result> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const a = await prisma.zoomAccount.findUnique({ where: { id }, select: { isActive: true } });
  if (!a) return { ok: false, error: "NOT_FOUND" };
  await prisma.zoomAccount.update({ where: { id }, data: { isActive: !a.isActive } });
  await logAudit({ userId: session.user.id, action: "ZOOM_ACCOUNT_TOGGLED", entity: "ZoomAccount", entityId: id, metadata: { newState: !a.isActive }, ipAddress: await ip() });
  revalidatePath("/admin/zoom-accounts");
  return { ok: true, data: null };
}

export async function testZoomAccountAction(
  id: string
): Promise<Result<{ message: string; accountEmail?: string; plan?: string }>> {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const acc = await prisma.zoomAccount.findUnique({ where: { id } });
  if (!acc) return { ok: false, error: "NOT_FOUND" };

  let creds: { accountId: string; clientId: string; clientSecret: string };
  if (acc.accountId && acc.clientId && acc.clientSecretEnc) {
    try {
      creds = { accountId: acc.accountId, clientId: acc.clientId, clientSecret: decryptSecret(acc.clientSecretEnc) };
    } catch {
      return { ok: false, error: "Could not read this account's saved key — check ENCRYPTION_KEY." };
    }
  } else {
    creds = {
      accountId: (process.env.ZOOM_ACCOUNT_ID ?? "").trim(),
      clientId: (process.env.ZOOM_CLIENT_ID ?? "").trim(),
      clientSecret: (process.env.ZOOM_CLIENT_SECRET ?? "").trim(),
    };
    if (!creds.accountId || !creds.clientId || !creds.clientSecret)
      return { ok: false, error: "This account reuses the main Zoom connection, but that isn't configured in the server settings." };
  }

  const res = await testZoom(creds, acc.hostEmail);
  await prisma.zoomAccount.update({ where: { id }, data: { lastCheckedAt: new Date(), lastCheckOk: res.ok } });
  return res.ok
    ? { ok: true, data: { message: res.message, accountEmail: res.accountEmail, plan: res.plan } }
    : { ok: false, error: res.message };
}
