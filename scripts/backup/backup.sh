#!/usr/bin/env bash
# =============================================================================
# El Wataniya ERP - Production Backup (Linux / bash)
#   * pg_dump custom-format (schema + data + sequences), timestamped
#   * application uploads/files archive (tar.gz)
#   * retention pruning (BACKUP_RETENTION_DAYS)
#   * optional external/off-server copy (BACKUP_EXTERNAL_COMMAND)
# Fails loudly on any error (non-zero exit). No credentials are embedded.
# Supports pg_dump directly (host tools) OR through the Postgres container.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# --- Config resolution -------------------------------------------------------
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

DATABASE_URL="${DATABASE_URL:-${CFG[DATABASE_URL]:-postgresql://localhost:5432/elwataniya_erp}}"
PGHOST="${PGHOST:-${CFG[POSTGRES_HOST]:-localhost}}"
PGPORT="${PGPORT:-${CFG[POSTGRES_PORT]:-5432}}"
PGUSER="${PGUSER:-${CFG[POSTGRES_USER]:-elwataniya}}"
PGDATABASE="${PGDATABASE:-${CFG[POSTGRES_DB]:-elwataniya_erp}}"
PGPASSWORD="${PGPASSWORD:-${CFG[POSTGRES_PASSWORD]:-}}"
export PGPASSWORD
CONTAINER="${CFG[POSTGRES_CONTAINER]:-elwataniya-postgres}"

BACKUP_DIR="${BACKUP_DIR:-${CFG[BACKUP_DIR]:-$REPO_ROOT/backups}}"
PREFIX="${PREFIX:-${CFG[BACKUP_PREFIX]:-elwataniya_erp}}"
RETENTION_DAYS="${RETENTION_DAYS:-${CFG[BACKUP_RETENTION_DAYS]:-14}}"
UPLOAD_DIRS="${UPLOAD_DIRS:-${CFG[BACKUP_UPLOAD_DIRS]:-$REPO_ROOT/backend/uploads,$REPO_ROOT/uploads}}"
EXTERNAL_CMD="${EXTERNAL_CMD:-${CFG[BACKUP_EXTERNAL_COMMAND]:-}}"

mkdir -p "$BACKUP_DIR"
NAME="$(date +%Y%m%d-%H%M%S)"
DB_FILE="$BACKUP_DIR/${PREFIX}-${NAME}.dump"
FILES_ARCHIVE="$BACKUP_DIR/${PREFIX}-files-${NAME}.tar.gz"
echo "==> Backup session: $NAME"
echo "==> Database: $PGDATABASE (user=$PGUSER host=$PGHOST port=$PGPORT)"

run_pg() {
    if docker inspect "$CONTAINER" >/dev/null 2>&1; then
        docker exec "$CONTAINER" sh -c "$*"
    else
        eval "$*"
    fi
}

# --- 1. PostgreSQL custom-format dump ----------------------------------------
echo "==> pg_dump (custom format) ..."
if docker inspect "$CONTAINER" >/dev/null 2>&1; then
    TMP_IN="/tmp/erp-backup-${NAME}.dump"
    docker exec "$CONTAINER" pg_dump -U "$PGUSER" -Fc -f "$TMP_IN" "$PGDATABASE"
    docker cp "${CONTAINER}:${TMP_IN}" "$DB_FILE"
    docker exec "$CONTAINER" rm -f "$TMP_IN"
else
    pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -Fc -f "$DB_FILE" "$PGDATABASE"
fi
[ -s "$DB_FILE" ] || { echo "ERROR: pg_dump produced an empty file" >&2; exit 1; }
echo "==> DB backup OK: $DB_FILE ($(stat -c%s "$DB_FILE") bytes)"

# --- 2. Uploads / files archive ----------------------------------------------
echo "==> Packaging upload directories ..."
TAR_ARGS=(-czf "$FILES_ARCHIVE")
ADDED=0
IFS=',' read -ra DIRS <<< "$UPLOAD_DIRS"
for d in "${DIRS[@]}"; do
    d="$(echo "$d" | xargs)"
    [ -z "$d" ] && continue
    case "$d" in /*) ABS="$d" ;; *) ABS="$REPO_ROOT/$d" ;; esac
    [ -d "$ABS" ] || { echo "WARN: upload dir not found, skipping: $ABS" >&2; continue; }
    TAR_ARGS+=(-C "$(dirname "$ABS")" "$(basename "$ABS")")
    ADDED=1
    echo "==> Adding upload dir: $ABS"
done
if [ "$ADDED" = "1" ]; then
    tar "${TAR_ARGS[@]}"
    echo "==> Files backup OK: $FILES_ARCHIVE"
else
    echo "WARN: no upload directories found; files archive not created" >&2
    FILES_ARCHIVE=""
fi

# --- 3. Retention pruning ----------------------------------------------------
if [ "$RETENTION_DAYS" -gt 0 ] 2>/dev/null; then
    PRUNED=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "${PREFIX}*" -mtime "+$RETENTION_DAYS" -print)
    if [ -n "$PRUNED" ]; then
        echo "$PRUNED" | xargs rm -f
        echo "==> Pruned backups older than $RETENTION_DAYS days: $(echo "$PRUNED" | wc -l) file(s)"
    else
        echo "==> Retention: no files older than $RETENTION_DAYS days to prune"
    fi
else
    echo "==> Retention: disabled (BACKUP_RETENTION_DAYS=0 keeps all backups)"
fi

# --- 4. External / off-server copy -------------------------------------------
if [ -n "$EXTERNAL_CMD" ]; then
    echo "==> Running BACKUP_EXTERNAL_COMMAND ..."
    export BACKUP_DB_FILE="$DB_FILE" BACKUP_FILES_ARCHIVE="$FILES_ARCHIVE" BACKUP_NAME="$NAME"
    eval "$EXTERNAL_CMD"
    echo "==> External copy OK"
else
    echo "WARN: BACKUP_EXTERNAL_COMMAND is not set - backups are stored LOCALLY ONLY. Configure off-server storage for production." >&2
fi

echo ""
echo "==> BACKUP COMPLETE (PASS): $NAME"
echo "    DB:   $DB_FILE"
[ -n "$FILES_ARCHIVE" ] && echo "    FILES: $FILES_ARCHIVE"
