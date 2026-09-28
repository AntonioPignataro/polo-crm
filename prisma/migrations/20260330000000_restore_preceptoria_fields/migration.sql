-- RestorePreceptoriaFields
ALTER TABLE "appointments" ADD COLUMN "purposes" TEXT;
ALTER TABLE "appointments" ADD COLUMN "goals" TEXT;
ALTER TABLE "appointments" ADD COLUMN "life_plan" TEXT;
ALTER TABLE "appointments" ADD COLUMN "main_topics" TEXT;
