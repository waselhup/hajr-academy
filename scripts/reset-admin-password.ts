/**
 * Reset the superadmin password.
 *
 * Run with:
 *   npx tsx scripts/reset-admin-password.ts
 *
 * What it does:
 *   1. Re-hashes the password "Hajr2026!" with bcryptjs (matches src/lib/auth.ts).
 *   2. Updates the row for superadmin@hajracademy.com — keeps every other admin
 *      intact.
 *   3. Writes an AuditLog row so this is traceable.
 *
 * Idempotent: re-running it just produces a fresh hash + new audit row.
 * The script exits 1 if the user is missing so a mistake is loud.
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const TARGET_EMAIL = "superadmin@hajracademy.com";
const NEW_PASSWORD = "Hajr2026!";
const BCRYPT_ROUNDS = 10;

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL },
    select: { id: true, email: true, role: true, isActive: true },
  });

  if (!user) {
    console.error(`❌ User not found: ${TARGET_EMAIL}`);
    console.error("   Aborting without changes.");
    process.exit(1);
  }

  if (!user.isActive) {
    console.warn(`⚠️  User ${TARGET_EMAIL} is INACTIVE — login will still fail`);
    console.warn("   even after reset. Re-activate via Prisma Studio if needed.");
  }

  const passwordHash = await bcrypt.hash(NEW_PASSWORD, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "ADMIN_PASSWORD_RESET",
      entity: "User",
      entityId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
        source: "scripts/reset-admin-password.ts",
        // Never log the password itself.
      },
    },
  });

  console.log(`✅ Password reset for ${TARGET_EMAIL} → ${NEW_PASSWORD}`);
  console.log(`   user id: ${user.id}`);
  console.log(`   role:    ${user.role}`);
  console.log(`   audit:   ADMIN_PASSWORD_RESET row written`);
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
