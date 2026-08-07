/** One-off: a 1.00 SAR PurchaseOrder used to smoke-test the live gateway. */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.purchaseOrder.create({
    data: {
      studentName: "TEST — Moyasar live check",
      phone: "0502456651",
      packageType: "ESSENTIAL",
      amountSar: "1.00",
      paymentStatus: "PENDING",
      notes: "Live gateway smoke test — refund after verifying.",
      source: "moyasar_smoke_test",
    },
    select: { id: true, amountSar: true },
  });
  console.log("PAY URL: https://hajracademy.com/ar/checkout/pay/" + order.id);
  console.log("ORDER ID:", order.id, "AMOUNT:", String(order.amountSar));
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
