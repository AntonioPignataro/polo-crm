-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'DIRETOR', 'PRECEPTOR', 'MONITOR', 'PAI');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('G1', 'G2', 'G3');

-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('SEXTA', 'SABADO', 'AMBOS');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ATIVO', 'INATIVO', 'EX_SOCIO');

-- CreateEnum
CREATE TYPE "ParentRelationship" AS ENUM ('PAI', 'MAE', 'RESPONSAVEL');

-- CreateEnum
CREATE TYPE "PolarCategory" AS ENUM ('PRESENCA', 'PONTUALIDADE', 'AMIGO', 'ESPORTE', 'ENCARGO', 'MULTA', 'LIVRO', 'ESTUDO', 'BOLETIM');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('DISPONIVEL', 'EMPRESTADO');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('SACERDOTE', 'PRECEPTORIA_SOCIO', 'PRECEPTORIA_PAIS');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('PLANEJADA', 'INSCRICOES_ABERTAS', 'INSCRICOES_ENCERRADAS', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "FormationType" AS ENUM ('PALESTRA_PAI', 'PALESTRA_CASAL');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('MENSALIDADE', 'ATIVIDADE', 'FORMACAO');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('CLUBE_REGULAR', 'ATIVIDADE', 'FORMACAO_PAIS', 'FERIADO', 'OUTROS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ALERTA_PRESENCA', 'ALERTA_PRECEPTORIA', 'LEMBRETE_PAGAMENTO', 'LEMBRETE_ATIVIDADE', 'GERAL');

-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "settings" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "code" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "birth_date" DATE NOT NULL,
    "address" TEXT,
    "group_type" "GroupType" NOT NULL,
    "module" "ModuleType" NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'ATIVO',
    "enrollment_date" DATE,
    "enrollment_form_url" TEXT,
    "monthly_fee" DECIMAL(10,2) NOT NULL,
    "preceptor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "profession" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "cpf" TEXT,
    "relationship" "ParentRelationship" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_parents" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,

    CONSTRAINT "member_parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polar_entries" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "category" "PolarCategory" NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT,
    "registered_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "polar_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polar_configs" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "category" "PolarCategory" NOT NULL,
    "default_points" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "polar_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "day_type" "ModuleType" NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "on_time" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "code" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "status" "BookStatus" NOT NULL DEFAULT 'DISPONIVEL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_loans" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "checkout_date" DATE NOT NULL,
    "due_date" DATE,
    "return_date" DATE,
    "registered_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "notes" TEXT,
    "conducted_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "priest_queue" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "priest_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "attachment_url" TEXT,
    "registration_open" TIMESTAMP(3),
    "registration_close" TIMESTAMP(3),
    "cost_per_person" DECIMAL(10,2),
    "final_cost" DECIMAL(10,2),
    "status" "ActivityStatus" NOT NULL DEFAULT 'PLANEJADA',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_registrations" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "member_id" TEXT,
    "participant_name" TEXT NOT NULL,
    "participant_cpf" TEXT,
    "participant_birth_date" DATE,
    "is_external" BOOLEAN NOT NULL DEFAULT false,
    "registered_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_formations" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FormationType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cost" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_formations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_formation_attendance" (
    "id" TEXT NOT NULL,
    "formation_id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "parent_formation_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_hours" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "week_start" DATE NOT NULL,
    "hours" DECIMAL(5,1) NOT NULL,
    "registered_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "reference_month" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDENTE',
    "due_date" DATE NOT NULL,
    "paid_at" TIMESTAMP(3),
    "payment_method" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "event_type" "CalendarEventType" NOT NULL,
    "activity_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clubs_slug_key" ON "clubs"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_club_id_email_key" ON "users"("club_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "members_club_id_code_key" ON "members"("club_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "parents_user_id_key" ON "parents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_parents_member_id_parent_id_key" ON "member_parents"("member_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "polar_configs_club_id_category_key" ON "polar_configs"("club_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_club_id_date_day_type_key" ON "attendance_sessions"("club_id", "date", "day_type");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_session_id_member_id_key" ON "attendance_records"("session_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "books_club_id_code_key" ON "books"("club_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "priest_queue_session_id_member_id_key" ON "priest_queue"("session_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_formation_attendance_formation_id_parent_id_key" ON "parent_formation_attendance"("formation_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "study_hours_member_id_week_start_key" ON "study_hours"("member_id", "week_start");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_preceptor_id_fkey" FOREIGN KEY ("preceptor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parents" ADD CONSTRAINT "parents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_parents" ADD CONSTRAINT "member_parents_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_parents" ADD CONSTRAINT "member_parents_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polar_entries" ADD CONSTRAINT "polar_entries_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polar_entries" ADD CONSTRAINT "polar_entries_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polar_configs" ADD CONSTRAINT "polar_configs_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_conducted_by_fkey" FOREIGN KEY ("conducted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priest_queue" ADD CONSTRAINT "priest_queue_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priest_queue" ADD CONSTRAINT "priest_queue_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_registrations" ADD CONSTRAINT "activity_registrations_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_registrations" ADD CONSTRAINT "activity_registrations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_registrations" ADD CONSTRAINT "activity_registrations_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_formations" ADD CONSTRAINT "parent_formations_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_formation_attendance" ADD CONSTRAINT "parent_formation_attendance_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "parent_formations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_formation_attendance" ADD CONSTRAINT "parent_formation_attendance_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_hours" ADD CONSTRAINT "study_hours_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_hours" ADD CONSTRAINT "study_hours_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
