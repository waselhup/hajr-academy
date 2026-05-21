/**
 * Resilient chunk applier for Phase 6 seed.
 *
 * The Supabase pgbouncer pooler is intermittently available and drops
 * long-running jobs. This script applies each seed-p6-chunk-NN.sql file
 * as one statement batch, retrying on transient connection errors with
 * a fresh PrismaClient each attempt. Idempotent: re-running is safe
 * because chunk 00 clears the tables before any inserts.
 *
 * Run: npx tsx prisma/apply-chunks.ts
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const dir = __dirname;
const MAX_RETRIES = 30;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isTransient(msg: string): boolean {
  // Connection drops AND statement/transaction timeouts (57014, P2034) are
  // all worth retrying against the flaky pooler.
  return /closed the connection|reach database|P1017|P1001|P2034|ECONNRESET|terminating|57014|statement timeout/i.test(
    msg
  );
}

/** Apply a single SQL statement, retrying on transient pooler errors. */
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
      if (!isTransient(msg) || attempt === MAX_RETRIES) {
        throw new Error(`${label} failed (attempt ${attempt}): ${msg}`);
      }
      const wait = Math.min(15_000, 1000 * 2 ** Math.min(attempt, 4));
      await sleep(wait);
    }
  }
}

/**
 * Each TestQuestion INSERT carries a deterministic UUID. Extract the id
 * from a statement so a chunk can be skipped if its rows already exist.
 */
function firstQuestionId(statements: string[]): string | null {
  for (const s of statements) {
    if (s.startsWith('INSERT INTO "TestQuestion"')) {
      const m = s.match(/VALUES \('([0-9a-f-]{36})'/i);
      if (m) return m[1];
    }
  }
  return null;
}

/** Check whether a question id is already present (resume support). */
async function questionExists(id: string): Promise<boolean> {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe<{ c: bigint }[]>(
      `SELECT COUNT(*)::int AS c FROM "TestQuestion" WHERE id = '${id}'`
    );
    return Number(rows[0]?.c ?? 0) > 0;
  } catch {
    return false; // On error, fall through and re-apply.
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

/**
 * Apply a chunk file one statement at a time. Per-statement inserts are
 * small and complete well within any pooler timeout; each is retried
 * independently so a transient drop never loses prior progress.
 *
 * Resume-aware: if the chunk's first question already exists, the whole
 * chunk is skipped — so a re-run after an outage continues, not restarts.
 */
async function applyOne(file: string, sql: string): Promise<void> {
  const statements = sql
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("--"));

  const qid = firstQuestionId(statements);
  if (qid && (await questionExists(qid))) {
    console.log(`  ⏭ ${file} (already applied)`);
    return;
  }

  for (let i = 0; i < statements.length; i++) {
    await applyStatement(statements[i], `${file}#${i + 1}`);
  }
  console.log(`  ✓ ${file} (${statements.length} statements)`);
}

async function main() {
  const chunks = readdirSync(dir)
    .filter((f) => /^seed-p6-chunk-\d+\.sql$/.test(f))
    .sort();

  if (chunks.length === 0) {
    console.error("No chunk files found. Run: npx tsx prisma/seed-phase-6.ts --emit-chunks");
    process.exit(1);
  }

  console.log(`Applying ${chunks.length} chunk files...`);

  // Resume detection: if questions already exist, this is a re-run after
  // an interrupted apply — skip the DELETE chunk so prior rows survive.
  const probe = new PrismaClient();
  let existingCount = 0;
  try {
    const rows = await probe.$queryRawUnsafe<{ c: number }[]>(
      `SELECT COUNT(*)::int AS c FROM "TestQuestion"`
    );
    existingCount = Number(rows[0]?.c ?? 0);
  } catch {
    /* table may not be reachable yet — treat as fresh */
  } finally {
    await probe.$disconnect().catch(() => {});
  }
  const isResume = existingCount > 0;
  if (isResume) {
    console.log(`Resume mode: ${existingCount} questions already present — keeping them.`);
  }

  for (const file of chunks) {
    // Chunk 00 is the DELETE/clear step; skip it on resume.
    if (file.endsWith("chunk-00.sql") && isResume) {
      console.log(`  ⏭ ${file} (resume — not clearing existing data)`);
      continue;
    }
    const sql = readFileSync(join(dir, file), "utf8");
    await applyOne(file, sql);
  }
  console.log("✅ All chunks applied.");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
