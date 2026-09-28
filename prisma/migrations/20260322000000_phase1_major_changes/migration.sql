-- Phase 1: Major Schema Changes Migration
-- ==========================================

-- 1. Add notificationsPaused to clubs
ALTER TABLE "clubs" ADD COLUMN "notifications_paused" BOOLEAN NOT NULL DEFAULT false;

-- 2. ModuleType enum: Remove AMBOS, Add QUINTA
ALTER TYPE "ModuleType" ADD VALUE IF NOT EXISTS 'QUINTA';

-- 3. Create member_modules junction table
CREATE TABLE "member_modules" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "module_type" "ModuleType" NOT NULL,
    CONSTRAINT "member_modules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "member_modules_member_id_module_type_key" ON "member_modules"("member_id", "module_type");
ALTER TABLE "member_modules" ADD CONSTRAINT "member_modules_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Migrate data from members.module to member_modules
INSERT INTO "member_modules" ("id", "member_id", "module_type")
SELECT gen_random_uuid()::text, "id", "module"
FROM "members"
WHERE "module" IN ('SEXTA', 'SABADO');

-- For AMBOS: insert two rows (SEXTA + SABADO)
INSERT INTO "member_modules" ("id", "member_id", "module_type")
SELECT gen_random_uuid()::text, "id", 'SEXTA'::"ModuleType"
FROM "members"
WHERE "module" = 'AMBOS';

INSERT INTO "member_modules" ("id", "member_id", "module_type")
SELECT gen_random_uuid()::text, "id", 'SABADO'::"ModuleType"
FROM "members"
WHERE "module" = 'AMBOS';

-- 5. Drop the module column from members
ALTER TABLE "members" DROP COLUMN "module";

-- 6. Remove AMBOS from ModuleType enum
-- PostgreSQL doesn't support dropping enum values directly.
-- We need to create a new type, migrate, and swap.
-- First, convert any AMBOS values in attendance_sessions to SEXTA (AMBOS shouldn't exist in day_type, but safety first)
ALTER TABLE "attendance_sessions" ALTER COLUMN "day_type" TYPE text;
UPDATE "attendance_sessions" SET "day_type" = 'SEXTA' WHERE "day_type" = 'AMBOS';
ALTER TABLE "member_modules" ALTER COLUMN "module_type" TYPE text;

ALTER TYPE "ModuleType" RENAME TO "ModuleType_old";
CREATE TYPE "ModuleType" AS ENUM ('QUINTA', 'SEXTA', 'SABADO');

ALTER TABLE "attendance_sessions" ALTER COLUMN "day_type" TYPE "ModuleType" USING "day_type"::"ModuleType";
ALTER TABLE "member_modules" ALTER COLUMN "module_type" TYPE "ModuleType" USING "module_type"::"ModuleType";

DROP TYPE "ModuleType_old";

-- 7. MemberStatus: Remove EX_SOCIO
-- First migrate any EX_SOCIO data to INATIVO
UPDATE "members" SET "status" = 'INATIVO' WHERE "status" = 'EX_SOCIO';

ALTER TABLE "members" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "MemberStatus" RENAME TO "MemberStatus_old";
CREATE TYPE "MemberStatus" AS ENUM ('ATIVO', 'INATIVO');
ALTER TABLE "members" ALTER COLUMN "status" TYPE "MemberStatus" USING "status"::text::"MemberStatus";
ALTER TABLE "members" ALTER COLUMN "status" SET DEFAULT 'ATIVO'::"MemberStatus";
DROP TYPE "MemberStatus_old";

-- 8. Remove monthlyFee from members (mensalidades removal)
ALTER TABLE "members" DROP COLUMN "monthly_fee";

-- 9. Remove invoices table and related enums
DROP TABLE IF EXISTS "invoices";
DROP TYPE IF EXISTS "InvoiceType";
DROP TYPE IF EXISTS "InvoiceStatus";

-- 10. PolarCategory: Remove LEILAO/GERAL, add EXERCICIO/RESUMO/OUTROS_PONTOS
-- Convert to text first to avoid invalid enum value errors during data migration
ALTER TABLE "polar_entries" ALTER COLUMN "category" TYPE text;
ALTER TABLE "polar_configs" ALTER COLUMN "category" TYPE text;

-- Migrate LEILAO -> GERAL -> OUTROS_PONTOS (text-level, safe regardless of current enum values)
UPDATE "polar_entries" SET "category" = 'OUTROS_PONTOS' WHERE "category" IN ('LEILAO', 'GERAL');
UPDATE "polar_configs" SET "category" = 'OUTROS_PONTOS' WHERE "category" IN ('LEILAO', 'GERAL');

-- Delete duplicate configs that may arise from merging LEILAO+GERAL into OUTROS_PONTOS
DELETE FROM "polar_configs" a USING "polar_configs" b
WHERE a."id" > b."id" AND a."club_id" = b."club_id" AND a."category" = b."category";

-- Swap the enum type
ALTER TYPE "PolarCategory" RENAME TO "PolarCategory_old";
CREATE TYPE "PolarCategory" AS ENUM ('PRESENCA', 'PONTUALIDADE', 'AMIGO', 'ESPORTE', 'ENCARGO', 'MULTA', 'EXERCICIO', 'BOLETIM', 'RESUMO', 'OUTROS_PONTOS', 'LIVRO', 'ESTUDO');

ALTER TABLE "polar_entries" ALTER COLUMN "category" TYPE "PolarCategory" USING "category"::"PolarCategory";
ALTER TABLE "polar_configs" ALTER COLUMN "category" TYPE "PolarCategory" USING "category"::"PolarCategory";

DROP TYPE "PolarCategory_old";

-- 11. CalendarEventType: Rename ATIVIDADE -> ATIVIDADE_EXTERNA, FERIADO -> SEM_ATIVIDADE
ALTER TYPE "CalendarEventType" RENAME TO "CalendarEventType_old";
CREATE TYPE "CalendarEventType" AS ENUM ('CLUBE_REGULAR', 'ATIVIDADE_EXTERNA', 'FORMACAO_PAIS', 'SEM_ATIVIDADE', 'OUTROS');

ALTER TABLE "calendar_events" ALTER COLUMN "event_type" TYPE text;
UPDATE "calendar_events" SET "event_type" = 'ATIVIDADE_EXTERNA' WHERE "event_type" = 'ATIVIDADE';
UPDATE "calendar_events" SET "event_type" = 'SEM_ATIVIDADE' WHERE "event_type" = 'FERIADO';
ALTER TABLE "calendar_events" ALTER COLUMN "event_type" TYPE "CalendarEventType" USING "event_type"::"CalendarEventType";

DROP TYPE "CalendarEventType_old";

-- 12. CalendarEvent: Remove activityId FK
ALTER TABLE "calendar_events" DROP CONSTRAINT IF EXISTS "calendar_events_activity_id_fkey";
ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "activity_id";

-- 13. FormationType: Rename PALESTRA_PAI -> FORMACAO_PAI, PALESTRA_CASAL -> FORMACAO_CASAL
ALTER TYPE "FormationType" RENAME TO "FormationType_old";
CREATE TYPE "FormationType" AS ENUM ('FORMACAO_PAI', 'FORMACAO_CASAL');

ALTER TABLE "parent_formations" ALTER COLUMN "type" TYPE text;
UPDATE "parent_formations" SET "type" = 'FORMACAO_PAI' WHERE "type" = 'PALESTRA_PAI';
UPDATE "parent_formations" SET "type" = 'FORMACAO_CASAL' WHERE "type" = 'PALESTRA_CASAL';
ALTER TABLE "parent_formations" ALTER COLUMN "type" TYPE "FormationType" USING "type"::"FormationType";

DROP TYPE "FormationType_old";

-- 14. ParentFormation: Add description, Remove cost
ALTER TABLE "parent_formations" ADD COLUMN "description" TEXT;
ALTER TABLE "parent_formations" DROP COLUMN IF EXISTS "cost";

-- 15. Activity: Remove finalCost
ALTER TABLE "activities" DROP COLUMN IF EXISTS "final_cost";

-- 16. ActivityRegistration: Add parentId, canGiveRide, needsRide
ALTER TABLE "activity_registrations" ADD COLUMN "parent_id" TEXT;
ALTER TABLE "activity_registrations" ADD COLUMN "can_give_ride" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "activity_registrations" ADD COLUMN "needs_ride" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "activity_registrations" ADD CONSTRAINT "activity_registrations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 17. Appointment: Remove extra fields (keep only notes)
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "purposes";
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "goals";
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "life_plan";
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "main_topics";

-- 18. Book: Add bookCategory enum and fields
CREATE TYPE "BookCategory" AS ENUM ('LITERATURA', 'LEITURA_ESPIRITUAL', 'FORMACAO_HUMANA');
ALTER TABLE "books" ADD COLUMN "book_category" "BookCategory";
ALTER TABLE "books" ADD COLUMN "synopsis" TEXT;

-- 19. BookLoan: Add finished field
ALTER TABLE "book_loans" ADD COLUMN "finished" BOOLEAN NOT NULL DEFAULT false;

-- 20. NotificationType: Add ALTERACAO_CALENDARIO
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ALTERACAO_CALENDARIO';

-- 21. CalendarChangeType enum and CalendarNotificationQueue table
CREATE TYPE "CalendarChangeType" AS ENUM ('CREATED', 'UPDATED', 'DELETED');

CREATE TABLE "calendar_notification_queue" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "event_title" TEXT NOT NULL,
    "event_date" DATE NOT NULL,
    "change_type" "CalendarChangeType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "calendar_notification_queue_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "calendar_notification_queue" ADD CONSTRAINT "calendar_notification_queue_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 22. Remove invoices relation from members (already done by dropping invoices table)
-- The FK was on invoices.member_id pointing to members.id, so dropping the table handles it.

-- =====================================================================
-- 23. Fix gaps from prior sessions not covered by the initial migration
-- =====================================================================

-- 23a. UserRole: Rename PAI -> USUARIO (from Session 17)
ALTER TYPE "UserRole" RENAME VALUE 'PAI' TO 'USUARIO';

-- 23b. NotificationType: Add missing values and remove stale LEMBRETE_PAGAMENTO
-- (ALERTA_FORMACAO_PAIS from Session 14, ANIVERSARIO from Session 9)
-- First migrate any LEMBRETE_PAGAMENTO data to GERAL before swapping
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE text;
UPDATE "notifications" SET "type" = 'GERAL' WHERE "type" = 'LEMBRETE_PAGAMENTO';
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
CREATE TYPE "NotificationType" AS ENUM ('ALERTA_PRESENCA', 'ALERTA_PRECEPTORIA', 'ALERTA_FORMACAO_PAIS', 'LEMBRETE_ATIVIDADE', 'GERAL', 'ANIVERSARIO', 'ALTERACAO_CALENDARIO');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType" USING "type"::"NotificationType";
DROP TYPE "NotificationType_old";

-- 23c. Create Sex enum (from Session 17 — guardians with sex field)
CREATE TYPE "Sex" AS ENUM ('MASCULINO', 'FEMININO');

-- 23d. Add sex column to parents table
ALTER TABLE "parents" ADD COLUMN "sex" "Sex";

-- 23e. Make parents.user_id nullable (from Session 17 — Parent ↔ User decoupling)
ALTER TABLE "parents" ALTER COLUMN "user_id" DROP NOT NULL;

-- 23f. Add missing book columns (from Session 13 — Google Books API integration)
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "subtitle" TEXT;
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "isbn" TEXT;
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "publisher" TEXT;
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "published_date" TEXT;
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "page_count" INTEGER;
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "language" TEXT;
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "cover_url" TEXT;

-- 23g. Add index on books(club_id, isbn)
CREATE INDEX IF NOT EXISTS "books_club_id_isbn_idx" ON "books"("club_id", "isbn");

-- 23h. Add updated_at column to appointments
ALTER TABLE "appointments" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 23i. Change notifications.channel default from WHATSAPP to EMAIL (from Session 9)
ALTER TABLE "notifications" ALTER COLUMN "channel" SET DEFAULT 'EMAIL';
UPDATE "notifications" SET "channel" = 'EMAIL' WHERE "channel" = 'WHATSAPP';

-- 23j. Add cascade delete on attendance_records -> attendance_sessions
ALTER TABLE "attendance_records" DROP CONSTRAINT IF EXISTS "attendance_records_session_id_fkey";
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 23k. Add cascade delete on parent_formation_attendance -> parent_formations
ALTER TABLE "parent_formation_attendance" DROP CONSTRAINT IF EXISTS "parent_formation_attendance_formation_id_fkey";
ALTER TABLE "parent_formation_attendance" ADD CONSTRAINT "parent_formation_attendance_formation_id_fkey"
  FOREIGN KEY ("formation_id") REFERENCES "parent_formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
