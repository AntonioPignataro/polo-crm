-- Soft-delete (archive) support for books. Existing rows get NULL by default,
-- meaning "not archived". The library catalog filters out non-NULL rows so
-- archived books no longer appear as borrowable, while loan history still
-- references them and report joins continue to resolve.

ALTER TABLE "books" ADD COLUMN "archived_at" TIMESTAMP(3);
