/**
 * Applies the Communication System migration
 * (prisma/migrations-communication.sql) to the Supabase database.
 *
 * Mirrors apply-chunks.ts: retries transient pooler drops with a fresh
 * PrismaClient per attempt. The SQL is fully idempotent, so re-running
 * after an outage is always safe.
 *
 * Run: npx tsx prisma/apply-communication.ts
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const MAX_RETRIES = 30;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isTransient(msg: string): boolean {
  return /closed the connection|reach database|P1017|P1001|P2034|ECONNRESET|terminating|57014|statement timeout/i.test(
    msg
  );
}

/**
 * Split the migration into top-level statements. `DO $$ ... $$;` blocks
 * are kept intact (dollar-quoted bodies may contain semicolons).
 */
function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inDollar = false;
  for (const rawLine of sql.split("\n")) {
    const line = rawLine.replace(/--.*$/, "");
    if (!line.trim() && !buf.trim()) continue;
    if (line.includes("$$")) inDollar = !inDollar;
    buf += line + "\n";
    if (!inDollar && buf.trim().endsWith(";")) {
      out.push(buf.trim());
      buf = "";
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

async function applyStatement(stmt: string, label: string): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const prisma = new PrismaClient();
    try {
      await prisma.$executeRawUnsafe(stmt);
      await prisma.$disconnect();
      return;
    } catch (e: unknown) {
      await prisma.$disconnect().catch(() => {});
      const msg = e instanceof Error ? e.message : String(e);
      // The storage.buckets insert needs the storage schema; if the role
      // can't see it, warn but don't fail the whole migration.
      if (/storage\.buckets|schema "storage"/i.test(stmt) && /permission|does not exist/i.test(msg)) {
        console.warn(`  ⚠ ${label}: ${msg.split("\n")[0]} — create the bucket in the Supabase dashboard instead.`);
        return;
      }
      if (!isTransient(msg) || attempt === MAX_RETRIES) {
        throw new Error(`${label} failed (attempt ${attempt}): ${msg}`);
      }
      await sleep(Math.min(15_000, 1000 * 2 ** Math.min(attempt, 4)));
    }
  }
}

async function main() {
  const sql = readFileSync(join(__dirname, "migrations-communication.sql"), "utf8");
  const statements = splitStatements(sql);
  console.log(`Applying ${statements.length} statements...`);
  for (let i = 0; i < statements.length; i++) {
    await applyStatement(statements[i], `stmt#${i + 1}`);
    console.log(`  ✓ stmt#${i + 1}`);
  }
  console.log("✅ Communication migration applied.");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
