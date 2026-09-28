-- Remove ESTUDO from PolarCategory enum.
-- Postgres does not support DROP VALUE on an enum, so we recreate the type.

-- 1. Delete dependent rows
DELETE FROM "polar_entries" WHERE "category" = 'ESTUDO';
DELETE FROM "polar_configs" WHERE "category" = 'ESTUDO';

-- 2. Recreate enum without ESTUDO
ALTER TYPE "PolarCategory" RENAME TO "PolarCategory_old";

CREATE TYPE "PolarCategory" AS ENUM (
  'PRESENCA',
  'PONTUALIDADE',
  'AMIGO',
  'ESPORTE',
  'ENCARGO',
  'MULTA',
  'EXERCICIO',
  'BOLETIM',
  'RESUMO',
  'OUTROS_PONTOS',
  'LIVRO'
);

ALTER TABLE "polar_entries"
  ALTER COLUMN "category" TYPE "PolarCategory"
  USING ("category"::text::"PolarCategory");

ALTER TABLE "polar_configs"
  ALTER COLUMN "category" TYPE "PolarCategory"
  USING ("category"::text::"PolarCategory");

DROP TYPE "PolarCategory_old";
