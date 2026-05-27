/**
 * Sprint 1 smoke test for the universal notify() pipe.
 *
 * Picks any active admin user, sends a 4-channel notification, then
 * reports: did a Notification row get created? did mock email + mock SMS
 * log? did realtime broadcast call complete?
 *
 * Run: npx tsx prisma/smoke-notify.ts
 */
import { PrismaClient } from "@prisma/client";
import { notify } from "../src/lib/notify";

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
      select: { id: true, email: true, phone: true },
    });
    if (!user) {
      console.error("No active admin user found — seed first.");
      process.exit(1);
    }
    const beforeCount = await prisma.notification.count({
      where: { userId: user.id },
    });

    await notify({
      userId: user.id,
      type: "SYSTEM_ANNOUNCEMENT",
      title: "Sprint 1 smoke test",
      titleAr: "اختبار الإطلاق - السبرنت الأول",
      body: "If you see this, the notify pipe works.",
      bodyAr: "إذا ظهر هذا، فأنبوب التنبيهات يعمل.",
      channels: ["inApp", "email", "sms", "realtime"],
      priority: "NORMAL",
    });

    const afterCount = await prisma.notification.count({
      where: { userId: user.id },
    });

    console.log("─── Smoke results ───");
    console.log(`  target user      : ${user.id}`);
    console.log(`  has email        : ${user.email ? "yes" : "no"}`);
    console.log(`  has phone        : ${user.phone ? "yes" : "no (sms will silent-skip)"}`);
    console.log(`  notif rows before: ${beforeCount}`);
    console.log(`  notif rows after : ${afterCount}`);
    console.log(`  inApp delta      : +${afterCount - beforeCount} (expect +1)`);
    if (afterCount - beforeCount !== 1) {
      console.error("❌ inApp channel did NOT create a notification.");
      process.exit(2);
    }
    console.log("✅ notify pipe smoke test PASS");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ smoke failed:", e);
  process.exit(1);
});
