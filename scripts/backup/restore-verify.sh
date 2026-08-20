#!/usr/bin/env bash
# =============================================================================
# El Wataniya ERP - Restore Verification (Linux / bash)
#   Restores the latest backup into a SEPARATE temporary/staging database,
#   restores the uploads archive, runs integrity checks and compares
#   source vs restored data. NEVER touches the real database.
# Fails loudly; exit code 0 only when every check passes.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

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
PREFIX="${PREFIX:-${CFG[BACKUP_PREFIX]:-elwataniya_erp}}"
BACKUP_DIR="${BACKUP_DIR:-${CFG[BACKUP_DIR]:-$REPO_ROOT/backups}}"

BACKUP_FILE="${BACKUP_FILE:-}"
if [ -z "$BACKUP_FILE" ]; then
    BACKUP_FILE="$(ls -1t "$BACKUP_DIR"/${PREFIX}-*.dump 2>/dev/null | head -n1 || true)"
fi
[ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ] || { echo "ERROR: no backup dump file found" >&2; exit 1; }
echo "==> Restore-verify dump: $BACKUP_FILE"

STAMP="$(basename "$BACKUP_FILE" | sed -E "s/^[^-]+-([0-9]{8}-[0-9]{6})\.dump$/\1/")"
FILES_ARCHIVE="${FILES_ARCHIVE:-}"
if [ -z "$FILES_ARCHIVE" ] && [ -n "$STAMP" ]; then
    [ -f "$BACKUP_DIR/${PREFIX}-files-${STAMP}.tar.gz" ] && FILES_ARCHIVE="$BACKUP_DIR/${PREFIX}-files-${STAMP}.tar.gz"
fi
if [ -z "$FILES_ARCHIVE" ]; then
    FILES_ARCHIVE="$(ls -1t "$BACKUP_DIR"/${PREFIX}-files-*.tar.gz 2>/dev/null | head -n1 || true)"
fi
[ -n "$FILES_ARCHIVE" ] && echo "==> Files archive: $FILES_ARCHIVE" || echo "WARN: no files archive; file checks skipped" >&2

STAMP2="$(date +%Y%m%d-%H%M%S)"
STAGING_DB="elwataniya_erp_restore_test_${STAMP2}"
TMP_RESTORE_DIR="${TMP_RESTORE_DIR:-$(mktemp -d)}"

psql_src() { docker exec "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -t -A -c "$1"; }
psql_res() { docker exec "$CONTAINER" psql -U "$PGUSER" -d "$STAGING_DB" -t -A -c "$1"; }

echo "==> Creating staging DB: $STAGING_DB"
docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -c "CREATE DATABASE \"$STAGING_DB\"" >/dev/null

echo "==> Restoring into staging DB ..."
docker cp "$BACKUP_FILE" "${CONTAINER}:/tmp/erp-restore-${STAMP2}.dump"
docker exec "$CONTAINER" pg_restore -U "$PGUSER" -d "$STAGING_DB" --no-owner --no-privileges "/tmp/erp-restore-${STAMP2}.dump"
docker exec "$CONTAINER" rm -f "/tmp/erp-restore-${STAMP2}.dump"

# --- Restore uploads ---------------------------------------------------------
RESTORED_FILES=0
if [ -n "$FILES_ARCHIVE" ]; then
    echo "==> Extracting files archive to $TMP_RESTORE_DIR"
    tar -xzf "$FILES_ARCHIVE" -C "$TMP_RESTORE_DIR"
    RESTORED_FILES="$(find "$TMP_RESTORE_DIR" -type f | wc -l)"
    echo "==> Restored $RESTORED_FILES file(s)"
fi

# --- Integrity checks --------------------------------------------------------
FAIL=0
echo ""
echo "==> INTEGRITY CHECKS (source=$PGDATABASE vs staging=$STAGING_DB)"
TABLES=(User Project Building Subcontractor EmployerBoqItem AnalyticalBoqItem
    ContractorBoqItem ContractorBoqItemVersion FinalBoqItem Distribution DistributionRow
    Component Statement StatementItem StatementDeduction Payment ProjectFund
    FundTransaction Purchase Miscellaneous InventoryItem Warehouse StockMovement
    Employee Attendance Notification FileRecord ProjectBoardDocument Supplier Client
    Approval ClientStatement SubcontractorStatement AuditLog TimelineEvent
    AiConversation SignatureWorkflow Role Permission UserRoleAssignment
    UserProjectAssignment Company BuildingSubcontractor Category Department EmployeeRole
    EmployeeShift Holiday Leave RefreshToken BoqCodeCounter Setting SettingChangeLog
    Shift SignatureAction SignatureRequest SignatureWorkflowStep EventStoreRecord)
for t in "${TABLES[@]}"; do
    SRC="$(psql_src "SELECT count(*) FROM \"$t\"")"
    RES="$(psql_res "SELECT count(*) FROM \"$t\"")"
    if [ "$SRC" = "$RES" ]; then
        printf '  %-32s source=%-8s restored=%-8s OK\n' "$t" "$SRC" "$RES"
    else
        printf '  %-32s source=%-8s restored=%-8s MISMATCH\n' "$t" "$SRC" "$RES"
        FAIL=1
    fi
done

# --- File reference checks ---------------------------------------------------
echo ""
echo "==> FILE REFERENCE CHECKS"
for col in logo smallLogo watermark stamp signature; do
    while IFS= read -r line; do
        [ -z "$line" ] && continue
        case "$line" in
            *https://*|*http://*|/uploads/*) echo "  company.$col -> $line : OK (external/absolute)" ;;
            *.*)
                if [ -f "$TMP_RESTORE_DIR/$line" ]; then
                    echo "  company.$col -> $line : OK"
                else
                    echo "  company.$col -> $line : MISSING FILE"
                    FAIL=1
                fi
                ;;
            *) echo "  company.$col -> $line : OK (non-file value)" ;;
        esac
    done < <(psql_res "SELECT \"$col\" FROM \"Company\" WHERE \"$col\" <> ''")
done

# --- FileRecord references (uploaded files via file module) ------------------
if [ "$RESTORED_FILES" -gt 0 ] 2>/dev/null; then
    while IFS= read -r line; do
        [ -z "$line" ] && continue
        rel="${line#/}"
        if find "$TMP_RESTORE_DIR" -type f \( -path "*/$rel" -o -name "$(basename "$line")" \) | grep -q .; then
            echo "  FileRecord -> $line : OK"
        else
            echo "  FileRecord -> $line : MISSING FILE"
            FAIL=1
        fi
    done < <(psql_res "SELECT path FROM \"FileRecord\" WHERE path <> ''")
fi

# --- Prisma migrations integrity --------------------------------------------
MIG_SRC="$(psql_src 'SELECT count(*) FROM "_prisma_migrations"')"
MIG_RES="$(psql_res 'SELECT count(*) FROM "_prisma_migrations"')"
if [ "$MIG_SRC" = "$MIG_RES" ]; then
    echo "  _prisma_migrations  source=$MIG_SRC restored=$MIG_RES OK"
else
    echo "  _prisma_migrations  MISMATCH ($MIG_SRC vs $MIG_RES)"
    FAIL=1
fi

# --- Deep checksum checks on critical tables ---------------------------------
echo ""
echo "==> DEEP CHECKSUM CHECKS (md5 of full row content)"
for t in User Project Building Subcontractor Company ProjectFund Statement Setting; do
    SRC="$(psql_src "SELECT COALESCE(md5(string_agg(t::text, chr(10) ORDER BY t::text)), '') FROM (SELECT * FROM \"$t\") t")"
    RES="$(psql_res "SELECT COALESCE(md5(string_agg(t::text, chr(10) ORDER BY t::text)), '') FROM (SELECT * FROM \"$t\") t")"
    if [ "$SRC" = "$RES" ]; then
        printf '  %-32s checksum=%s... OK\n' "$t" "${SRC:0:16}"
    else
        printf '  %-32s checksum MISMATCH (src=%s res=%s)\n' "$t" "$SRC" "$RES"
        FAIL=1
    fi
done

# --- Cleanup staging ---------------------------------------------------------
echo ""
echo "==> Cleaning up staging DB and temp dirs ..."
docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$STAGING_DB' AND pid<>pg_backend_pid()" >/dev/null 2>&1 || true
docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -c "DROP DATABASE IF EXISTS \"$STAGING_DB\"" >/dev/null
rm -rf "$TMP_RESTORE_DIR"

if [ "$FAIL" != "0" ]; then
    echo ""
    echo "==> RESTORE VERIFICATION FAILED"
    exit 1
fi
echo ""
echo "==> RESTORE VERIFICATION PASS"
