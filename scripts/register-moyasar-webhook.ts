/**
 * Register the HAJR webhook with Moyasar (idempotent).
 *
 * Usage:
 *   MOYASAR_SECRET_KEY=sk_live_… MOYASAR_WEBHOOK_SECRET=… npx tsx scripts/register-moyasar-webhook.ts
 *
 * Creates https://hajracademy.com/api/payments/webhook with the shared
 * secret; skips creation if a webhook for that URL already exists.
 */
const BASE = "https://api.moyasar.com/v1";
const WEBHOOK_URL = "https://hajracademy.com/api/payments/webhook";

const secretKey = process.env.MOYASAR_SECRET_KEY ?? "";
const sharedSecret = process.env.MOYASAR_WEBHOOK_SECRET ?? "";

if (!secretKey || !sharedSecret) {
  console.error("Set MOYASAR_SECRET_KEY and MOYASAR_WEBHOOK_SECRET first.");
  process.exit(1);
}

const headers = {
  Authorization: `Basic ${Buffer.from(secretKey + ":").toString("base64")}`,
  "Content-Type": "application/json",
};

async function main() {
  const listRes = await fetch(`${BASE}/webhooks`, { headers });
  const list = (await listRes.json()) as {
    webhooks?: { id: string; url: string }[];
    message?: string;
  };
  if (!listRes.ok) {
    console.error(`List failed (${listRes.status}):`, list.message ?? list);
    process.exit(1);
  }
  const existing = (list.webhooks ?? []).find((w) => w.url === WEBHOOK_URL);
  if (existing) {
    console.log("Webhook already registered:", existing.id, existing.url);
    return;
  }

  const createRes = await fetch(`${BASE}/webhooks`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      url: WEBHOOK_URL,
      http_method: "post",
      shared_secret: sharedSecret,
    }),
  });
  const created = (await createRes.json()) as {
    id?: string;
    url?: string;
    message?: string;
  };
  if (!createRes.ok) {
    console.error(`Create failed (${createRes.status}):`, created.message ?? created);
    process.exit(1);
  }
  console.log("Webhook registered:", created.id, created.url);

  const events = await fetch(`${BASE}/webhooks/available_events`, { headers });
  if (events.ok) {
    console.log("Available events:", await events.json());
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
