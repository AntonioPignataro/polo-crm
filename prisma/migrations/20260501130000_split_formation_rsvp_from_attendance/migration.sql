-- Split "parent self-confirmation (RSVP)" from "monitor-verified attendance"
-- on parent_formation_attendance.
--
-- Before this change: every row was created by a parent clicking "Confirmar
-- presença" with present=true. Reports + alerts treated those clicks as
-- the source of truth for who attended.
--
-- After this change: parent RSVPs set `confirmed=true` only. A separate
-- monitor-only flow sets `present`. Reports + alerts continue to filter
-- on `present=true`, so they automatically only count monitor-verified
-- attendance.
--
-- Backfill (Option B): every existing row was a parent self-confirmation
-- under the old model. Mark them confirmed=true to preserve the RSVP
-- intent, and reset present=false to remove the implicit "monitor said
-- they were there" claim that those rows were carrying. Admins can
-- re-mark present per parent for past formations using the new
-- mark-formation-attendance flow.

ALTER TABLE "parent_formation_attendance"
  ADD COLUMN "confirmed" BOOLEAN NOT NULL DEFAULT false;

UPDATE "parent_formation_attendance"
  SET "confirmed" = true, "present" = false;
