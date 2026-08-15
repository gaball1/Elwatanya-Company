# Final Backup & Recovery Report — El Wataniya ERP

Date: 2026-08-15
Environment: Windows dev (PowerShell), PostgreSQL 16 running in Docker
(`elwataniya-postgres`), pg_dump/psql 16.14 inside the container.

## Summary

| Item | Result |
|---|---|
| PostgreSQL backup | **PASS** — custom-format dump 807,588 bytes |
| Uploads/files backup | **PASS** — 31 files, 1,079,997 bytes, tar archive |
| Restore into separate staging DB | **PASS** |
| Integrity checks (counts) | **PASS** — 58 tables, source == restored |
| Deep checksums (critical tables) | **PASS** — 8 tables md5 identical |
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
- `BACKUP_EXTERNAL_COMMAND=` — **not set** (local-only). Production must set
  this for off-server copies (rclone/aws/scp); a warning is emitted until then.
- `POSTGRES_CONTAINER=elwataniya-postgres`.

## 3. Files backed up

Uploads snapshot (all 31 files, 1,079,997 bytes) from `backend/uploads/`
(company logos, building-document PDF) and `uploads/` (company images):
manifests compared by name+size before and after archiving — **identical**.

## 4. Database backup result

`pg_dump -Fc` → `backups/elwataniya_erp-20260815-215949.dump` (807,588 bytes).
Non-empty file verified; pg_dump exit code 0.

## 5. Restore result

Restored with `pg_restore --no-owner --no-privileges` into
`elwataniya_erp_restore_test_20260815-215951` (created for the test).
Files archive extracted to a temp dir (31 files). Restore completed with no
errors.

## 6. Integrity verification results

Row counts matched for all 58 business/schema tables, e.g.:

```
User 1=1, Project 1=1, Building 1=1, Subcontractor 1=1,
EmployerBoqItem 1=1, AnalyticalBoqItem 1=1, ContractorBoqItem 1=1,
FinalBoqItem 1=1, Statement 1=1, StatementItem 1=1, StatementDeduction 1=1,
Payment 1=1, ProjectFund 1=1, FundTransaction 6=6, Purchase 1=1,
Warehouse 1=1, Employee 1=1, Notification 19=19, AuditLog 29=29,
TimelineEvent 13=13, Setting 66=66, Role 11=11, Permission 139=139,
_prisma_migrations 52=52
```

Deep checksums (md5 over full row text) identical for User, Project, Building,
Subcontractor, Company, ProjectFund, Statement, Setting.

File-reference checks: no dangling references found (Company branding columns
are currently empty in this dataset; the check runs on `FileRecord.path` and
all five `Company` image columns).

## 7. Original vs restored counts

Verified by re-running the baseline count query against the real
`elwataniya_erp` after the test: **identical** to the pre-task baseline
(e.g. Notification=19, AuditLog=29, FundTransaction=6). The original database
was not modified by any backup/restore step.

## 8. Failure handling

- `$ErrorActionPreference='Stop'` / `set -euo pipefail` — any failure aborts.
- Empty dump file → explicit failure.
- External-copy failure → non-zero exit.
- Staging DB and temp dirs are always cleaned in a final block.

## 9. Retention configuration

`BACKUP_RETENTION_DAYS=14`; pruning runs at the end of each backup
(current run pruned 0 files — all younger than 14 days).

## 10. Scheduling

Windows: `scripts/backup/schedule-windows.ps1` (Task Scheduler, daily).
Linux: `scripts/backup/schedule-cron.example` (cron daily at 02:00, plus an
optional daily restore-verify job). Backups do not require the app to run.

## 11. Remaining limitations

- Backups are stored locally only until `BACKUP_EXTERNAL_COMMAND` is
  configured for off-server/object storage. **Action required in production.**
- Crash-consistent per artifact (no filesystem-level snapshot across DB+files).
- Backup/restore was exercised on the Windows PowerShell path; the bash
  scripts mirror it but must be smoke-tested once on Linux.

## 12. Exact commands used

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backup/backup.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backup/restore-verify.ps1
```

Also available as `npm run backup` and `npm run backup:verify`.

## 13. Final status

**PASS** — BACKUP → RESTORE (separate DB) → VERIFY (counts + checksums +
files) → clean original DB, zero residue.
