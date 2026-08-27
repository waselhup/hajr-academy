/**
 * Grant or revoke access to the marketing traffic dashboard.
 *
 *   npx tsx scripts/grant-traffic-access.ts <email>            # grant
 *   npx tsx scripts/grant-traffic-access.ts <email> --revoke   # revoke
 *   npx tsx scripts/grant-traffic-access.ts --list             # who has it
 *
 * The dashboard shows ad spend performance and revenue per campaign, so it is
 * off for everyone by default — including other admins. Access is a per-user
 * flag, not a role (see src/lib/analytics/traffic-access.ts).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function list(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { canViewTraffic: true },
    select: { email: true, name: true, role: true, isActive: true },
    orderBy: { email: "asc" },
  });

  if (users.length === 0) {
    console.log("\n  Nobody currently has traffic dashboard access.\n");
    return;
  }

  console.log(`\n  ${users.length} account(s) with traffic access:\n`);
  for (const u of users) {
    console.log(`    ${u.email}  —  ${u.name ?? "(no name)"}  [${u.role}]${u.isActive ? "" : "  (DEACTIVATED)"}`);
  }
  console.log("");
}

async function setAccess(email: string, granted: boolean): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, name: true, role: true, isActive: true, canViewTraffic: true },
  });

  if (!user) throw new Error(`No HAJR account with the email ${email}.`);

  // Guard rather than silently granting: the page is reached through the admin
  // shell, so a STUDENT with the flag would be redirected away and the grant
  // would look like it had worked.
  if (granted && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    throw new Error(
      `${email} is ${user.role}. The traffic dashboard lives in the admin area, so the account must be ADMIN or SUPER_ADMIN.`,
    );
  }

  if (user.canViewTraffic === granted) {
    console.log(`\n  No change — ${email} already ${granted ? "has" : "does not have"} access.\n`);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { canViewTraffic: granted },
  });

  console.log(`\n  ${granted ? "Granted" : "Revoked"} traffic access for ${user.name ?? email}.`);
  if (granted) {
    console.log(`  They can now open:  /ar/admin/traffic  (or /en/admin/traffic)`);
    if (!user.isActive) {
      console.log(`  Note: this account is currently deactivated, so it cannot sign in.`);
    }
  }
  console.log("");
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--list")) {
    await list();
    return;
  }

  const email = args.find((a) => !a.startsWith("--"));
  if (!email) {
    console.error("\n  Usage: npx tsx scripts/grant-traffic-access.ts <email> [--revoke]");
    console.error("         npx tsx scripts/grant-traffic-access.ts --list\n");
    process.exit(1);
  }

  await setAccess(email, !args.includes("--revoke"));
}

main()
  .catch((err) => {
    console.error(`\n  ${err instanceof Error ? err.message : err}\n`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
