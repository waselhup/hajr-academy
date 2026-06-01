/**
 * Applies the Applicant Portal migration (prisma/migrations-applicants.sql).
 * Idempotent. Run: npx tsx prisma/apply-applicants.ts
 *
 * Applicant Portal = isolated new-teacher applicant account type:
 * Role.APPLICANT + ApplicantProfile + ApplicantFeatureAccess (+ ApplicantStage,
 * ApplicantFeature enums). Additive only — no existing table is altered.
 *
 * Note: `ALTER TYPE "Role" ADD VALUE` cannot run inside a transaction block on
 * some Postgres setups, so the statements are applied one-at-a-time (autocommit)
 * exactly like the other apply-*.ts runners in this directory.
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
      if (/already exists|duplicate_object|duplicate column/i.test(msg)) {
        console.warn(`  ⚠ ${label}: already present, skipping.`);
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
  const sql = readFileSync(join(__dirname, "migrations-applicants.sql"), "utf8");
  const statements = splitStatements(sql);
  console.log(`Applying ${statements.length} Applicant Portal statements...`);
  for (let i = 0; i < statements.length; i++) {
    await applyStatement(statements[i], `stmt#${i + 1}`);
    console.log(`  ✓ stmt#${i + 1}`);
  }
  console.log("✅ Applicant Portal migration applied.");
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
