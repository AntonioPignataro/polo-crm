-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('MONITOR', 'ALL');

-- CreateTable
CREATE TABLE "report_files" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "visibility" "FileVisibility" NOT NULL DEFAULT 'MONITOR',
    "uploaded_by" TEXT NOT NULL,
    "uploader_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_files_storage_path_key" ON "report_files"("storage_path");

-- CreateIndex
CREATE INDEX "report_files_club_id_idx" ON "report_files"("club_id");

-- AddForeignKey
ALTER TABLE "report_files" ADD CONSTRAINT "report_files_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
