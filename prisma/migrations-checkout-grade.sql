-- ─────────────────────────────────────────────────────────────
-- Checkout grade migration — PurchaseOrder.gradeLevel.
--
-- The grade is mandatory in the checkout form + API; the column stays
-- nullable so orders created before this change remain valid.
--
-- Idempotent: safe to run repeatedly.
-- Apply via:  npx tsx prisma/apply-checkout-grade.ts
-- ─────────────────────────────────────────────────────────────

ALTER TABLE "PurchaseOrder"
  ADD COLUMN IF NOT EXISTS "gradeLevel" TEXT;
