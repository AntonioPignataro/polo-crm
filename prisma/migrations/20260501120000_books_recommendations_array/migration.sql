-- Replace the single-value `recommendation` column with a multi-value
-- `recommendations` array. The single-value column was added one migration
-- ago, before the requirement clarified, and contains only NULLs (no code
-- referenced it yet) — safe to drop.
--
-- All existing books are backfilled with {G1, G2, G3} to satisfy the new
-- "every book has at least one recommendation" rule. New books must specify
-- at least one group via app-level validation; the DB column itself uses an
-- empty-array default so writes without the field don't fail.

ALTER TABLE "books" DROP COLUMN IF EXISTS "recommendation";

ALTER TABLE "books"
  ADD COLUMN "recommendations" "GroupType"[] NOT NULL DEFAULT '{}';

UPDATE "books"
  SET "recommendations" = ARRAY['G1', 'G2', 'G3']::"GroupType"[]
  WHERE "recommendations" = '{}';
