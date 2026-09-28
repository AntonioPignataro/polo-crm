#!/usr/bin/env bash
#
# cutover-resync.sh — re-sync a NEW Supabase database from the OLD prod
# (ClubePolo) Supabase, which is the database the client is still using.
#
# Truncates the target's data and re-imports from a fresh pg_dump of old prod,
# then applies the post-import backfills the new schema needs.
#
# Usage:
#   scripts/cutover-resync.sh --target dev  --confirm      # rehearsal
#   scripts/cutover-resync.sh --target prod --confirm      # the real cutover
#   scripts/cutover-resync.sh --target prod --confirm --slug clubepolo
#
# Requirements:
#   - .env.ops at repo root with: OLD_PROD_DB_URL, OLD_PROD_DB_PASSWORD,
#     SUPABASE_PROD_PROJECT_REF, SUPABASE_PROD_DB_PASSWORD,
#     SUPABASE_DEV_PROJECT_REF, SUPABASE_DEV_DB_PASSWORD
#   - pg_dump and psql from PostgreSQL 17+ client tools
#     (install: `brew install libpq` — Homebrew leaves them keg-only at
#     /opt/homebrew/opt/libpq/bin)
#   - The TARGET must already be migrated to the current Prisma schema
#     (the script verifies this and refuses to run otherwise).
#
# Safety:
#   - Truncate is destructive but only on the target (never old prod).
#   - Source DB is dumped read-only; old prod is never modified.
#   - The dump is taken at run time, so it always reflects the client's
#     data as of RIGHT NOW. The client writes daily — for the real prod
#     cutover, run this immediately before flipping traffic.
#   - Dump file lives in /tmp and is deleted on success.

set -euo pipefail

TARGET=""
SLUG=""
CONFIRM=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET="${2:-}"; shift 2 ;;
    --slug)   SLUG="${2:-}";   shift 2 ;;
    --confirm) CONFIRM=1; shift ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

if [[ "$TARGET" != "dev" && "$TARGET" != "prod" ]]; then
  echo "ERROR: --target must be 'dev' or 'prod'."
  exit 1
fi

if [[ "$CONFIRM" != "1" ]]; then
  cat <<EOF
ERROR: This script is DESTRUCTIVE — it truncates all data in the
$TARGET database, then re-imports from the client's live old prod DB.

Re-run with --confirm:
  $0 --target $TARGET --confirm
EOF
  exit 1
fi

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -f .env.ops ]]; then
  echo "ERROR: .env.ops not found at $REPO_ROOT/.env.ops"
  exit 1
fi
set -a; source .env.ops; set +a

PG_DUMP="/opt/homebrew/opt/libpq/bin/pg_dump"
PSQL="/opt/homebrew/opt/libpq/bin/psql"
if [[ ! -x "$PG_DUMP" || ! -x "$PSQL" ]]; then
  echo "ERROR: pg_dump/psql not found. Run: brew install libpq"
  exit 1
fi

if [[ "$TARGET" == "prod" ]]; then
  TARGET_REF="$SUPABASE_PROD_PROJECT_REF"
  TARGET_PW="$SUPABASE_PROD_DB_PASSWORD"
else
  TARGET_REF="$SUPABASE_DEV_PROJECT_REF"
  TARGET_PW="$SUPABASE_DEV_DB_PASSWORD"
fi
TARGET_URL="postgresql://postgres.${TARGET_REF}@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"
DUMP_FILE="/tmp/sistema-polo-cutover-${TARGET}-$(date -u +%Y%m%d-%H%M%S).sql"

log() { printf "[%s] %s\n" "$(date -u +%H:%M:%SZ)" "$1"; }
tgt() { PGPASSWORD="$TARGET_PW" "$PSQL" "$TARGET_URL" -v ON_ERROR_STOP=1 "$@"; }

log "Cutover re-sync starting"
log "  source: old prod (ClubePolo) — READ ONLY"
log "  target: $TARGET ($TARGET_REF)"

# Step 0 — refuse to run unless the target carries the current schema.
# A data-only import into a stale schema silently loses the new columns.
log "Step 0/6: verifying target schema is current"
EXPECTED=$(ls -1 prisma/migrations | grep -vc migration_lock || true)
ACTUAL=$(tgt -t -A -c "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;")
if [[ "$ACTUAL" != "$EXPECTED" ]]; then
  cat <<EOF
ERROR: target '$TARGET' has $ACTUAL applied migrations but the repo has $EXPECTED.
Apply migrations to the target first, e.g.:
  DATABASE_URL="postgresql://postgres.${TARGET_REF}:<password>@aws-1-sa-east-1.pooler.supabase.com:5432/postgres" \\
    npx prisma migrate deploy
EOF
  exit 1
fi
log "  target at $ACTUAL/$EXPECTED migrations — OK"

# Step 1 — dump old prod (data only; schema comes from Prisma migrations)
log "Step 1/6: dumping old prod (live, as of now)"
PGPASSWORD="$OLD_PROD_DB_PASSWORD" "$PG_DUMP" "$OLD_PROD_DB_URL" \
  --data-only --no-owner --no-acl --schema=public \
  --exclude-table=_prisma_migrations \
  --file="$DUMP_FILE"
log "  dump size: $(ls -lh "$DUMP_FILE" | awk '{print $5}')"

# Step 2 — truncate the target's public tables
log "Step 2/6: truncating $TARGET public tables (CASCADE)"
tgt -c "
TRUNCATE
  clubs, users, members, member_modules, parents, member_parents,
  polar_configs, polar_entries,
  attendance_sessions, attendance_records, priest_queue,
  books, book_loans,
  appointments,
  activities, activity_registrations,
  parent_formations, parent_formation_attendance,
  study_hours,
  calendar_events, calendar_notification_queue,
  notifications, report_files
CASCADE;
" > /dev/null

# Step 3 — import in a single transaction
log "Step 3/6: importing dump into $TARGET (single transaction)"
PGPASSWORD="$TARGET_PW" "$PSQL" "$TARGET_URL" \
  -v ON_ERROR_STOP=1 --single-transaction --file="$DUMP_FILE" \
  > /tmp/cutover-import-$TARGET.log 2>&1 || {
    echo "IMPORT FAILED. Last lines of /tmp/cutover-import-$TARGET.log:"
    tail -30 /tmp/cutover-import-$TARGET.log
    exit 1
  }

# Step 4 — backfill: re-key legacy single-signature fichas to the per-parent shape.
# The old flow stored one flat {signature, signerName, ...} per member with no
# parent attribution. The new model keys signatures by Parent.id, so without this
# the signature reads as absent and that parent is asked to sign again.
# Resolves via signedByUserId -> parents.user_id.
log "Step 4/6: backfilling legacy signatures into the per-parent shape"
tgt -c "
UPDATE members m
SET enrollment_form_url = jsonb_build_object(
      'signatures', jsonb_build_object(p.id, jsonb_build_object(
        'signature',          m.enrollment_form_url::jsonb ->> 'signature',
        'signerName',         m.enrollment_form_url::jsonb ->> 'signerName',
        'signerCpf',          m.enrollment_form_url::jsonb ->> 'signerCpf',
        'signerRelationship', m.enrollment_form_url::jsonb ->> 'signerRelationship',
        'signedAt',           m.enrollment_form_url::jsonb ->> 'signedAt',
        'signedByUserId',     m.enrollment_form_url::jsonb ->> 'signedByUserId'
      ))
    )::text
FROM parents p
WHERE p.user_id = (m.enrollment_form_url::jsonb ->> 'signedByUserId')
  AND m.enrollment_form_url IS NOT NULL
  AND m.enrollment_form_url::jsonb ? 'signature'
  AND NOT (m.enrollment_form_url::jsonb ? 'signatures');
"

# Step 5 — backfill: inactivated_at for INATIVO members.
# The old schema had no deactivation date, and the period reports read a NULL
# inactivated_at as "never left" — which would show former members as active in
# every historical report. Derive each one's last real activity.
log "Step 5/6: backfilling inactivated_at for INATIVO members (last activity)"
tgt -c "
UPDATE members m
SET inactivated_at = COALESCE((
      SELECT max(d) FROM (
        SELECT max(s.date) AS d
          FROM attendance_records ar
          JOIN attendance_sessions s ON s.id = ar.session_id
         WHERE ar.member_id = m.id AND ar.present
        UNION ALL SELECT max(date)              FROM polar_entries WHERE member_id = m.id
        UNION ALL SELECT max(date)              FROM appointments  WHERE member_id = m.id
        UNION ALL SELECT max(week_start)        FROM study_hours   WHERE member_id = m.id
        UNION ALL SELECT max(checkout_date)     FROM book_loans    WHERE member_id = m.id
      ) x
    ), m.enrollment_date, m.created_at::date)
WHERE m.status = 'INATIVO' AND m.inactivated_at IS NULL;
"

# Step 6 — optional tenant slug. Without --slug the dump's own value is kept,
# because silently renaming the tenant changes the client's subdomain.
if [[ -n "$SLUG" ]]; then
  log "Step 6/6: setting clubs.slug = '$SLUG'"
  tgt -c "UPDATE clubs SET slug = '$SLUG';" > /dev/null
else
  CURRENT_SLUG=$(tgt -t -A -c "SELECT COALESCE(string_agg(slug, ','), '(none)') FROM clubs;")
  log "Step 6/6: keeping slug from dump ('$CURRENT_SLUG') — pass --slug to override"
fi

rm -f "$DUMP_FILE" /tmp/cutover-import-$TARGET.log

log "Verification — row counts on $TARGET:"
tgt -c "
SELECT relname AS tabela,
       (xpath('/row/c/text()',
              query_to_xml('SELECT count(*) AS c FROM public.' || quote_ident(relname),
                           true, true, '')))[1]::text::int AS linhas
FROM pg_class
WHERE relkind = 'r'
  AND relnamespace = 'public'::regnamespace
  AND relname <> '_prisma_migrations'
ORDER BY linhas DESC, relname;
"

log "Backfill results:"
tgt -c "
SELECT 'assinaturas no formato novo' AS item,
       count(*) FILTER (WHERE enrollment_form_url::jsonb ? 'signatures')::text AS valor FROM members
UNION ALL
SELECT 'assinaturas legadas restantes',
       count(*) FILTER (WHERE enrollment_form_url::jsonb ? 'signature')::text FROM members
UNION ALL
SELECT 'INATIVOS sem inactivated_at',
       count(*) FILTER (WHERE status='INATIVO' AND inactivated_at IS NULL)::text FROM members;
"

log "Re-sync complete on $TARGET."
