/**
 * Operational readiness check.
 *
 * Answers one question per line: is there anything a real customer could hit
 * today that would fail or dead-end? Read-only — it changes nothing.
 *
 *   npx tsx scripts/readiness-check.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ok = (s: string) => `  OK    ${s}`;
const warn = (s: string) => `  WARN  ${s}`;
const bad = (s: string) => `  BLOCK ${s}`;

async function main() {
  const out: string[] = [];

  // ── Selling ────────────────────────────────────────────────────────
  const products = await prisma.catalogProduct.count({ where: { isActive: true } });
  out.push(products > 0 ? ok(`${products} products on sale`) : bad("no products on sale"));

  // ── Trial booking ──────────────────────────────────────────────────
  const now = new Date();
  const slots = await prisma.trialSlot.findMany({
    where: { isActive: true, startsAt: { gte: now } },
    include: { _count: { select: { requests: true } } },
  });
  const seats = slots.reduce((n, s) => n + Math.max(0, s.capacity - s._count.requests), 0);
  out.push(
    seats > 0
      ? ok(`${seats} trial seats bookable across ${slots.length} upcoming slots`)
      : bad("NO trial slots published — /trial shows an empty state to every visitor")
  );

  // ── Live teaching capacity ─────────────────────────────────────────
  const zoom = await prisma.zoomAccount.findMany({ where: { isActive: true } });
  const concurrent = zoom.reduce((n, z) => n + z.maxConcurrent, 0) + 1; // +1 env host
  out.push(
    concurrent > 1
      ? ok(`${concurrent} classes can run at the same time`)
      : warn("only 1 class can run at a time (no extra Zoom hosts added yet)")
  );

  // ── Teachers ───────────────────────────────────────────────────────
  const teachers = await prisma.teacherProfile.count({ where: { active: true } });
  out.push(teachers > 0 ? ok(`${teachers} active teachers`) : warn("no active teachers on the platform"));

  // ── Money hygiene ──────────────────────────────────────────────────
  const paid = await prisma.purchaseOrder.count({ where: { paymentStatus: "PAID" } });
  const pending = await prisma.purchaseOrder.count({ where: { paymentStatus: "PENDING" } });
  const testish = await prisma.purchaseOrder.count({
    where: { OR: [{ studentName: { contains: "TEST", mode: "insensitive" } }, { notes: { contains: "test", mode: "insensitive" } }] },
  });
  out.push(ok(`${paid} paid orders · ${pending} pending`));
  if (testish > 0) out.push(warn(`${testish} order(s) look like test data — worth clearing before launch`));

  // A paid order without an account is only an emergency when nothing tried.
  // Fulfilment deliberately refuses some orders (an email already held by
  // another account, a staff address) and escalates instead — that is the
  // guard working, and reporting it as breakage would train the reader to
  // ignore this line.
  const stranded = await prisma.purchaseOrder.findMany({
    where: { paymentStatus: "PAID", provisionedStudentId: null },
    select: { id: true, studentName: true, amountSar: true },
  });
  if (stranded.length === 0) {
    out.push(ok("every paid order has an account"));
  } else {
    const escalations = await prisma.auditLog.findMany({
      where: {
        action: "ORDER_FULFILMENT_NEEDS_ADMIN",
        entityId: { in: stranded.map((o) => o.id) },
      },
      select: { entityId: true, metadata: true },
    });
    const byId = new Map(escalations.map((e) => [e.entityId, e.metadata as { reason?: string }]));
    for (const o of stranded) {
      const esc = byId.get(o.id);
      if (esc) {
        out.push(
          warn(
            `"${o.studentName}" (${Number(o.amountSar)} SAR) is waiting on you — ${esc.reason ?? "needs a decision"}`
          )
        );
      } else {
        out.push(
          bad(
            `"${o.studentName}" (${Number(o.amountSar)} SAR) paid and fulfilment never ran — they cannot log in`
          )
        );
      }
    }
  }

  // ── Configuration ──────────────────────────────────────────────────
  // These live in Vercel, not in the local .env. Run locally they would all
  // read as missing and drown the real findings, so an absent value is
  // reported as "cannot tell from here" rather than as a failure.
  const local = !process.env.VERCEL;
  const cfg = (name: string, present: boolean, whenMissing: string) => {
    if (present) return out.push(ok(name));
    return out.push(local ? `  ?     ${name} — set in Vercel; cannot read it from a local run` : bad(whenMissing));
  };
  cfg("email (Resend)", !!process.env.RESEND_API_KEY, "email NOT configured — nothing reaches customers");
  cfg("Moyasar live keys", !!process.env.MOYASAR_SECRET_KEY?.startsWith("sk_live"), "Moyasar not in live mode");
  cfg("webhook secret", !!process.env.MOYASAR_WEBHOOK_SECRET, "webhook secret missing");
  cfg("Apple Pay", process.env.NEXT_PUBLIC_MOYASAR_APPLE_PAY === "1", "Apple Pay off");
  cfg("commercial registration", !!process.env.ZATCA_CR_NUMBER, "no CR number published");
  out.push(
    process.env.UNIFONIC_APP_SID
      ? ok("SMS/WhatsApp configured")
      : warn("SMS/WhatsApp not configured — email only (deliberate)")
  );

  const vat = (process.env.ZATCA_VAT_NUMBER ?? "").trim();
  out.push(
    !vat || vat === "300000000000003"
      ? ok("not VAT registered — no VAT charged, plain invoices (correct for now)")
      : ok(`VAT registered (${vat}) — 15% applied`)
  );

  console.log("\nHAJR readiness\n" + "-".repeat(60));
  console.log(out.join("\n"));
  const blocks = out.filter((l) => l.includes("BLOCK")).length;
  const warns = out.filter((l) => l.includes("WARN")).length;
  console.log("-".repeat(60));
  console.log(`${blocks} blocking · ${warns} worth attention\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
