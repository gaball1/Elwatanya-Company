#!/usr/bin/env bash
# =============================================================================
# El Wataniya ERP - Disaster Recovery restore (Linux / bash)
#   DANGER: restores OVER the real database. Manual, operator-confirmed only.
#   Usage: BACKUP_FILE=/path/to/backup.dump ./dr-restore.sh [--files-only]
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

BACKUP_FILE="${BACKUP_FILE:-}"
FILES_ONLY="${FILES_ONLY:-0}"
SKIP_FILES="${SKIP_FILES:-0}"

[ -n "$BACKUP_FILE" ] || { echo "ERROR: BACKUP_FILE env var required" >&2; exit 1; }
[ -f "$BACKUP_FILE" ] || { echo "ERROR: backup file not found: $BACKUP_FILE" >&2; exit 1; }

declare -A CFG
load_env_file() {
    local f="$1"; [ -f "$f" ] || return 0
    while IFS='=' read -r k v; do
        [ -z "$k" ] && continue
        [[ "$k" =~ ^#.* ]] && continue
        v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
        CFG["$k"]="$v"
    done < <(grep -v '^[[:space:]]*#' "$f" | grep '=')
}
[ -f "$SCRIPT_DIR/backup.env" ] && load_env_file "$SCRIPT_DIR/backup.env"
load_env_file "$REPO_ROOT/backend/.env"

PGUSER="${PGUSER:-${CFG[POSTGRES_USER]:-elwataniya}}"
PGDATABASE="${PGDATABASE:-${CFG[POSTGRES_DB]:-elwataniya_erp}}"
CONTAINER="${CFG[POSTGRES_CONTAINER]:-elwataniya-postgres}"
PREFIX="${PREFIX:-${CFG[BACKUP_PREFIX]:-elwataniya_erp}}"
BACKUP_DIR="${BACKUP_DIR:-${CFG[BACKUP_DIR]:-$REPO_ROOT/backups}}"

echo "WARNING: This will OVERWRITE the real database '$PGDATABASE' and upload directories." >&2
read -r -p "Type RESTORE to continue: " ans
[ "$ans" = "RESTORE" ] || { echo "Aborted."; exit 1; }

STAMP="$(date +%Y%m%d-%H%M%S)"

if [ "$SKIP_FILES" != "1" ]; then
    FILES_ARCHIVE="${FILES_ARCHIVE:-}"
    if [ -z "$FILES_ARCHIVE" ]; then
        S="$(basename "$BACKUP_FILE" | sed -E "s/^[^-]+-([0-9]{8}-[0-9]{6})\.dump$/\1/")"
        [ -n "$S" ] && [ -f "$BACKUP_DIR/${PREFIX}-files-${S}.tar.gz" ] && FILES_ARCHIVE="$BACKUP_DIR/${PREFIX}-files-${S}.tar.gz"
    fi
    if [ -n "$FILES_ARCHIVE" ]; then
        echo "==> Restoring uploads from $FILES_ARCHIVE"
        tar -xzf "$FILES_ARCHIVE" -C "$REPO_ROOT"
        echo "==> Uploads restored."
    else
        echo "WARN: files archive not found; uploads NOT restored" >&2
    fi
fi

if [ "$FILES_ONLY" != "1" ]; then
    echo "==> Dropping and recreating database '$PGDATABASE' (data loss on current DB)."
    docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$PGDATABASE' AND pid<>pg_backend_pid()" >/dev/null 2>&1 || true
    docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -c "DROP DATABASE IF EXISTS \"$PGDATABASE\"" >/dev/null
    docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -c "CREATE DATABASE \"$PGDATABASE\"" >/dev/null
    docker cp "$BACKUP_FILE" "${CONTAINER}:/tmp/erp-dr-${STAMP}.dump"
    docker exec "$CONTAINER" pg_restore -U "$PGUSER" -d "$PGDATABASE" --no-owner --no-privileges "/tmp/erp-dr-${STAMP}.dump"
    docker exec "$CONTAINER" rm -f "/tmp/erp-dr-${STAMP}.dump"
    echo "==> Database restored from $BACKUP_FILE"
fi
echo "==> DR RESTORE COMPLETE"
