# Production Backup & Recovery — El Wataniya Construction ERP

This document describes the backup and recovery strategy for the entire El Wataniya ERP:
the PostgreSQL database and all persistent application files (uploads).

Scripts live in `scripts/backup/` and are platform-matched:

| Script | Purpose | Platform |
|---|---|---|
| `backup.ps1` / `backup.sh` | Full backup (DB custom-format dump + uploads tar), retention, optional off-server copy | Windows / Linux |
| `restore-verify.ps1` / `restore-verify.sh` | Restore backup into a **separate staging DB**, restore files, run integrity checks, compare source vs restored, clean up | Windows / Linux |
| `dr-restore.ps1` / `dr-restore.sh` | **Disaster recovery**: restore over the real DB (manual, operator-confirmed) | Windows / Linux |
| `schedule-windows.ps1` | Creates a Windows Task Scheduler job for automated backups | Windows |
| `schedule-cron.example` | Cron job template for automated backups on Linux | Linux |
| `backup.env.example` | All configuration, documented. Copy to `backup.env` (git-ignored) | both |

---

## 1. What is backed up

1. **PostgreSQL database** — complete schema, all migrations history, all
   data, sequences, indexes, constraints and relationships. Produced with
   `pg_dump --format=custom` (compressed, restore-aware, production-safe).
2. **Uploads / files** — every directory under `BACKUP_UPLOAD_DIRS`
   (default: `backend/uploads`, `uploads`), which holds uploaded invoices,
   company logos, stamps, signatures, PDFs/documents, project/building
   documents and any other persisted files. Archived with `tar`.

Database references to files (e.g. `FileRecord.path`, `Company.logo`) remain
valid after a restore because the files are restored as a unit with the DB.

## 2. Where backups are stored

- Local default: `./backups` (configurable via `BACKUP_DIR`), organised as:
  - `elwataniya_erp-<yyyyMMdd-HHmmss>.dump` — database dump
  - `elwataniya_erp-files-<yyyyMMdd-HHmmss>.tar(.gz)` — files archive
- Off-server / object storage: **strongly recommended for production**. Set
  `BACKUP_EXTERNAL_COMMAND` in `backup.env` to copy each artifact off the
  server (rclone / AWS CLI / scp / NFS). The variables `BACKUP_DB_FILE`,
  `BACKUP_FILES_ARCHIVE` and `BACKUP_NAME` are exported to that command.
- `backups/` and `scripts/backup/backup.env` are git-ignored.

## 3. Frequency & retention

- **Frequency:** configurable via OS scheduler. Windows: `schedule-windows.ps1`
  (Task Scheduler, defaults to daily 02:00, interval from
  `BACKUP_SCHEDULE_INTERVAL_MINUTES`). Linux: `schedule-cron.example`.
  Backups do **not** require the application to be running.
- **Retention:** `BACKUP_RETENTION_DAYS` (default 14). Older backup artifacts
  are pruned automatically at the end of each backup run. Set `0` to keep all.
- **Restore verification:** recommended daily on Linux via the cron template
  (it restores into a throwaway DB and drops it afterwards).

## 4. Restore procedure (normal / point-in-time)

Restoring into a **separate** database is done by `restore-verify.sh|ps1` —
use that for daily verification or for side-by-side inspection. It:

1. Creates a staging DB named `elwataniya_erp_restore_test_<ts>`.
2. Restores the chosen dump with `pg_restore --no-owner --no-privileges`.
3. Extracts the files archive to a temporary directory.
4. Runs integrity checks (counts on 58 tables, checksums on 8 critical
   tables, file-reference checks, migration count).
5. Compares **source vs restored** values.
6. Drops the staging DB and removes the temp directory — **never touches
   the real database**.

### Disaster recovery (overwrite the real database)

Only when the production DB is lost/corrupt and you accept data loss of the
current state:

```bash
# Linux
BACKUP_FILE=/path/to/backup.dump ./dr-restore.sh          # confirms with prompt
BACKUP_FILE=... FILES_ONLY=1 ./dr-restore.sh              # files only
# Windows
powershell -File scripts/backup/dr-restore.ps1 -BackupFile "..." -Yes
```

DR restore: terminates connections, drops & recreates the DB, restores the
dump, and restores the uploads archive into the repo root (matching the
directory layout captured at backup time). Always take a fresh backup first.

## 5. Restore verification / integrity checks

`restore-verify.*` verifies, after restore:

- Row counts on every business table: Users, Projects, Buildings, BOQ
  (Employer/Analytical/Contractor/Final), Distribution, Components,
  Statements + items + deductions, Payments, Project funds + transactions,
  Purchases, Miscellaneous, Inventory, Warehouses, Stock movements,
  Employees, Attendance, Notifications, Files/Board docs, Suppliers,
  Clients, Approvals, Client/Subcontractor statements, Audit log, Timeline,
  AI conversations, Signature workflows, Roles/Permissions, Company, and all
  other schema tables.
- Content checksums (md5 of full row text) on critical tables.
- File-reference resolution (`FileRecord.path`, `Company` logo/smallLogo/
  watermark/stamp/signature) against the restored files.
- `_prisma_migrations` count parity.

## 6. Failure handling

- Every script uses fail-fast semantics: any failed command aborts with a
  non-zero exit code; a `pg_dump` that produces an empty file is treated as
  a failure.
- If a backup fails, the operator (or CI/alerting on exit code) must notice
  immediately — a backup is only "working" when `restore-verify` passes.
- `BACKUP_EXTERNAL_COMMAND` failures fail the run loudly.
- Logs must be captured by the scheduler to a persistent log file.

## 7. Assumptions & limits

- Backups are **crash-consistent per artifact** (the app writes to uploads
  directly). For strict point-in-time consistency across DB+files, schedule
  backups during low-activity windows.
- `pg_dump` custom format is single-artifact; cross-server restore works
  with `--no-owner --no-privileges`.
- Off-server storage is **not configured by default** — production MUST set
  `BACKUP_EXTERNAL_COMMAND`, otherwise backups exist only on the same host.
- The PostgreSQL container is expected to be `elwataniya-postgres`
  (configurable via `POSTGRES_CONTAINER`).

## 8. Configuration reference

See `scripts/backup/backup.env.example` for the full documented list
(`POSTGRES_*`, `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`, `BACKUP_UPLOAD_DIRS`,
`BACKUP_EXTERNAL_COMMAND`, schedule settings). Create `scripts/backup/backup.env`
from the example and set at least `BACKUP_DIR` and (in production)
`BACKUP_EXTERNAL_COMMAND`.

Quick manual run:

```bash
npm run backup            # Windows dev: full backup into ./backups
npm run backup:verify     # Windows dev: restore-verify of the latest dump
```
