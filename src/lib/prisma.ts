import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Normalise the pooled DATABASE_URL.
 *
 * The Supabase pooler URL was configured with `connection_limit=1`, which
 * starves every page that fans out queries with `Promise.all` (the admin
 * dashboard fires ~9) — they exhaust the single connection and time out
 * with "Timed out fetching a new connection from the connection pool",
 * surfacing as 500s.
 *
 * pgbouncer in transaction mode (Supabase port 6543) safely supports a
 * larger Prisma pool, so we rewrite the URL here: a healthy
 * `connection_limit` and a longer `pool_timeout`. Done in code so the fix
 * ships with the deploy and does not depend on the Vercel env var.
 */
function normalizedDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const limit = parseInt(url.searchParams.get("connection_limit") ?? "0", 10);
    // Only bump it up — never lower a deliberately larger setting.
    if (!limit || limit < 10) {
      url.searchParams.set("connection_limit", "10");
    }
    if (!url.searchParams.get("pool_timeout")) {
      url.searchParams.set("pool_timeout", "20");
    }
    return url.toString();
  } catch {
    // Malformed URL — let Prisma surface its own error.
    return raw;
  }
}

const databaseUrl = normalizedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
