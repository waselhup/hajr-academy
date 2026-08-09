/**
 * Retire the term-reinforcement products the Early Registration 2026 pricing
 * replaced, so the site quotes ONE set of prices.
 *
 *   core-monthly  (300 / month)      -> early-first-month     (300 then 350)
 *   core-term     (1,215 / term)     -> early-4-months        (1,140)
 *   core-yearly   (2,106 / year)     -> early-academic-year   (2,400)
 *
 * They are HIDDEN (isActive = false), never deleted: past orders and any pay
 * link already sent reference these slugs, and slugs are immutable by design.
 * Hiding removes them from the site and the checkout list while leaving the
 * history intact — and it is reversible from /admin/finance/products.
 *
 * The summer tracks are deliberately left alone: the new page does not sell
 * them, but nothing supersedes them either, and silently killing a live
 * product line is not this script's call.
 *
 *   npx tsx scripts/retire-superseded-products.ts [--undo]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const UNDO = process.argv.includes("--undo");

const SUPERSEDED = ["core-monthly", "core-term", "core-yearly"];

async function main() {
  const before = await prisma.catalogProduct.findMany({
    where: { slug: { in: SUPERSEDED } },
    select: { slug: true, priceSar: true, isActive: true },
  });
  console.log("before:", before.map((p) => `${p.slug}=${p.priceSar}${p.isActive ? "" : " (hidden)"}`).join(", "));

  const res = await prisma.catalogProduct.updateMany({
    where: { slug: { in: SUPERSEDED } },
    data: { isActive: UNDO },
  });
  console.log(UNDO ? "restored:" : "hidden:", res.count);

  const live = await prisma.catalogProduct.findMany({
    where: { isActive: true },
    select: { slug: true, priceSar: true, group: true },
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
  });
  console.log("\nProducts on sale now:");
  console.table(live.map((p) => ({ slug: p.slug, price: String(p.priceSar), group: p.group })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
