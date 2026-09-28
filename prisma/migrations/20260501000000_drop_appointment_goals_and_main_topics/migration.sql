-- Drop unused appointment fields. Existing appointment rows are preserved;
-- only the data in these two columns is removed (per ALTER TABLE DROP COLUMN
-- semantics in PostgreSQL).

ALTER TABLE "appointments" DROP COLUMN IF EXISTS "goals";
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "main_topics";
