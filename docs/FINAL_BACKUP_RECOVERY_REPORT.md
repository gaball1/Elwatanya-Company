# Final Backup & Recovery Report — El Wataniya ERP

Date: 2026-08-16 (updated)
Environment: Windows dev (PowerShell), PostgreSQL 16 running in Docker
(`elwataniya-postgres`), pg_dump/psql 16.14 inside the container.
Dataset: fresh re-seeded DB (admin user, 140 permissions, 11 roles, 52 migrations).

## Summary

| Item | Result |
|---|---|
| PostgreSQL backup | **PASS** — custom-format dump (fresh) |
| Uploads/files backup | **PASS** — tar archive (backend/uploads + uploads) |
| External / off-server copy (`BACKUP_EXTERNAL_COMMAND`) | **PASS** — both artifacts copied to off-tree dir `D:\erp-backups` |
| Restore into separate staging DB | **PASS** |
| Integrity checks (counts) | **PASS** — 58 tables, source == restored |
| Deep checksums (critical tables) | **PASS** — md5 identical (incl. empty-table parity) |
| File references | **PASS** — all referenced files resolve |
| Migrations parity | **PASS** — 52/52 |
| Original DB untouched | **PASS** — baseline counts unchanged |
| QA residue | **PASS** — zero staging DBs / temp dirs left behind |

**Overall: PASS**

## 1. Implementation details

Artifacts under `scripts/backup/`:

- `backup.ps1` (Windows) / `backup.sh` (Linux) — full backup.
- `restore-verify.ps1` (Windows) / `restore-verify.sh` (Linux) — restore into a
  throwaway staging DB + integrity verification + comparison.
- `dr-restore.ps1` / `dr-restore.sh` — disaster-recovery restore (manual,
  operator-confirmed, overwrites the real DB).
- `schedule-windows.ps1`, `schedule-cron.example` — scheduling.
- `backup.env.example` — documented configuration (copy to `backup.env`).

The backup runs pg_dump in custom format (`-Fc`) inside the Postgres container
(to avoid exposing credentials on the host command line) and copies the file
out with `docker cp`. Uploads are archived with `tar` preserving relative
paths. No credentials are embedded in scripts; connection parameters come from
`backend/.env` (`DATABASE_URL`) and/or `scripts/backup/backup.env`.

## 2. Configuration

- `BACKUP_DIR=./backups` (git-ignored) — local artifact store.
- `BACKUP_RETENTION_DAYS=14` — retention/pruning enabled.
- `BACKUP_UPLOAD_DIRS=./backend/uploads,./uploads`.
- `BACKUP_EXTERNAL_COMMAND` — **configured and verified** to copy every backup
  artifact off-tree to `D:\erp-backups` (dev test target). For production,
  replace with a real rclone / AWS CLI / scp command; the exported variables
  `BACKUP_DB_FILE`, `BACKUP_FILES_ARCHIVE` and `BACKUP_NAME` are available to it.
- `POSTGRES_CONTAINER=elwataniya-postgres`.

### Production external-copy templates

The command receives `BACKUP_DB_FILE`, `BACKUP_FILES_ARCHIVE`, `BACKUP_NAME`.
Examples (Linux/`backup.sh`):

```bash
# rclone (any provider: S3, GDrive, B2, ...)
BACKUP_EXTERNAL_COMMAND='rclone copy "$BACKUP_DB_FILE" "$BACKUP_FILES_ARCHIVE" "erp-remote:erp-backups/"'
# AWS CLI
BACKUP_EXTERNAL_COMMAND='aws s3 cp "$BACKUP_DB_FILE" s3://my-bucket/erp-backups/ && aws s3 cp "$BACKUP_FILES_ARCHIVE" s3://my-bucket/erp-backups/'
# scp to a backup server
BACKUP_EXTERNAL_COMMAND='scp "$BACKUP_DB_FILE" "$BACKUP_FILES_ARCHIVE" backup@backup-host:/backups/'
```

Windows equivalents go in `backup.env` and are run through `cmd /c`.

## 3. Files backed up

Uploads snapshot from `backend/uploads/` (company logos, building-document PDF)
and `uploads/` (company images): manifests compared by name+size before and
after archiving — identical.

## 4. Database backup result

`pg_dump -Fc` → `backups/elwataniya_erp-<ts>.dump`. Non-empty file verified;
pg_dump exit code 0.

## 5. Restore result

Restored with `pg_restore --no-owner --no-privileges` into a
`elwataniya_erp_restore_test_<ts>` staging DB (created for the test). Files
archive extracted to a temp dir. Restore completed with no errors.

## 6. Integrity verification results

Row counts matched for all 58 business/schema tables, e.g.:

```
User 1=1, Role 11=11, Permission 140=140, UserRoleAssignment 1=1,
Notification 19=19, AuditLog 29=29, FundTransaction 6=6, Setting 66=66,
RefreshToken 9=9, _prisma_migrations 52=52
```

Deep checksums (md5 over full row text) identical for User, Project, Building,
Subcontractor, Company, ProjectFund, Statement, Setting. Empty business tables
(no seed data after re-seed) are correctly reported as parity OK.

File-reference checks: all referenced files resolve against the restored
archive (no dangling references).

## 7. Original vs restored counts

Verified by re-running the baseline count query against the real
`elwataniya_erp` after the test: identical to the baseline. The original
database was not modified by any backup/restore step.

## 8. Failure handling

- `$ErrorActionPreference='Stop'` / `set -euo pipefail` — any failure aborts.
- Empty dump file → explicit failure.
- External-copy failure → non-zero exit.
- Staging DB and temp dirs are always cleaned in a final block.

## 9. Retention configuration

`BACKUP_RETENTION_DAYS=14`; pruning runs at the end of each backup.

## 10. Scheduling

Windows: `scripts/backup/schedule-windows.ps1` (Task Scheduler, daily).
Linux: `scripts/backup/schedule-cron.example` (cron daily at 02:00, plus an
optional daily restore-verify job). Backups do not require the app to run.

## 11. Remaining limitations

- The external-copy command in this dev environment targets a local off-tree
  directory to prove the mechanism; production MUST replace it with a real
  rclone/AWS/scp target (templates above) and test once against that target.
- Crash-consistent per artifact (no filesystem-level snapshot across DB+files).
- Backup/restore was exercised on the Windows PowerShell path; the bash
  scripts mirror it (incl. the checksum parity fix) but must be smoke-tested
  once on Linux.

## 12. Exact commands used

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backup/backup.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backup/restore-verify.ps1
```

Also available as `npm run backup` and `npm run backup:verify`.

## 13. Final status

**PASS** — BACKUP → EXTERNAL COPY → RESTORE (separate DB) → VERIFY (counts +
checksums + files) → clean original DB, zero residue.

### Change log 2026-08-16

- `restore-verify.ps1` / `restore-verify.sh`: fixed deep-checksum comparison to
  treat equal (including both-empty) as OK — previously a freshly seeded DB
  with empty business tables produced false MISMATCH failures.
- `scripts/backup/backup.env`: `BACKUP_EXTERNAL_COMMAND` configured (dev target
  `D:\erp-backups`) and verified to copy DB dump + files archive.
