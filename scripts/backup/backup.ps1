# =============================================================================
# El Wataniya ERP - Production Backup (Windows / PowerShell)
#   * pg_dump custom-format (schema + data + sequences), timestamped
#   * application uploads/files archive (tar)
#   * retention pruning (BACKUP_RETENTION_DAYS)
#   * optional external/off-server copy (BACKUP_EXTERNAL_COMMAND)
# Fails loudly on any error (non-zero exit). No credentials are embedded.
# =============================================================================
[CmdletBinding()]
param(
    [string]$BackupDir,
    [string]$ConfigFile
)
$ErrorActionPreference = 'Stop'
$script:repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

# --- Load config ------------------------------------------------------------
$env = @{}
if (-not $ConfigFile -and (Test-Path (Join-Path $PSScriptRoot 'backup.env'))) {
    $ConfigFile = Join-Path $PSScriptRoot 'backup.env'
}
if ($ConfigFile -and (Test-Path $ConfigFile)) {
    Get-Content $ConfigFile | Where-Object { $_ -and $_ -notmatch '^\s*#' -and $_ -match '=' } | ForEach-Object {
        $k, $v = $_ -split '=', 2
        $env[$k.Trim()] = $v.Trim().Trim('"', "'")
    }
}
# Fall back to backend/.env DATABASE_URL for connection parameters.
$backendEnv = Join-Path $script:repoRoot 'backend\.env'
if (Test-Path $backendEnv) {
    Get-Content $backendEnv | Where-Object { $_ -match '^DATABASE_URL=' } | ForEach-Object {
        $env['DATABASE_URL'] = ($_ -split '=', 2)[1].Trim().Trim('"', "'")
    }
}

$dbUrl = if ($env['DATABASE_URL']) { $env['DATABASE_URL'] } else { 'postgresql://localhost:5432/elwataniya_erp' }
$m = [regex]::Match($dbUrl, '^postgres(?:ql)?://(?:([^:/@]+):([^@/]*)@)?([^:/@]+):?(\d+)?/([^?]+)')
if (-not $m.Success) { throw "Cannot parse DATABASE_URL: $dbUrl" }
$pgUser   = if ($m.Groups[1].Value) { $m.Groups[1].Value } else { if ($env['POSTGRES_USER']) { $env['POSTGRES_USER'] } else { 'elwataniya' } }
$pgPass   = if ($m.Groups[2].Value) { $m.Groups[2].Value } else { if ($env['POSTGRES_PASSWORD']) { $env['POSTGRES_PASSWORD'] } else { '' } }
$pgHost   = if ($m.Groups[3].Value) { $m.Groups[3].Value } else { if ($env['POSTGRES_HOST']) { $env['POSTGRES_HOST'] } else { 'localhost' } }
$pgPort   = if ($m.Groups[4].Value) { $m.Groups[4].Value } else { if ($env['POSTGRES_PORT']) { $env['POSTGRES_PORT'] } else { '5432' } }
$pgDb     = if ($m.Groups[5].Value) { $m.Groups[5].Value } else { if ($env['POSTGRES_DB']) { $env['POSTGRES_DB'] } else { 'elwataniya_erp' } }
$container = if ($env['POSTGRES_CONTAINER']) { $env['POSTGRES_CONTAINER'] } else { 'elwataniya-postgres' }

if (-not $BackupDir) { $BackupDir = if ($env['BACKUP_DIR']) { $env['BACKUP_DIR'] } else { Join-Path $script:repoRoot 'backups' } }
if (-not (Split-Path $BackupDir -IsAbsolute)) { $BackupDir = Join-Path $script:repoRoot $BackupDir }
$prefix      = if ($env['BACKUP_PREFIX']) { $env['BACKUP_PREFIX'] } else { 'elwataniya_erp' }
$retention   = if ($env['BACKUP_RETENTION_DAYS']) { [int]$env['BACKUP_RETENTION_DAYS'] } else { 14 }
$uploadDirs  = if ($env['BACKUP_UPLOAD_DIRS']) { $env['BACKUP_UPLOAD_DIRS'] -split ',' } else { @('backend/uploads', 'uploads') }
$externalCmd = if ($env['BACKUP_EXTERNAL_COMMAND']) { $env['BACKUP_EXTERNAL_COMMAND'] } else { '' }

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$name = Get-Date -Format 'yyyyMMdd-HHmmss'
$dbFile = Join-Path $BackupDir "$prefix-$name.dump"
$filesArchive = Join-Path $BackupDir "$prefix-files-$name.tar"
Write-Host "==> Backup session: $name"
Write-Host "==> Database: $pgDb (user=$pgUser host=$pgHost port=$pgPort)"

function Invoke-Pg([string]$container, [string]$cmd) {
    & docker exec $container sh -c $cmd 2>&1
    if ($LASTEXITCODE -ne 0) { throw "docker exec failed (exit $LASTEXITCODE): $cmd" }
}

# --- 1. PostgreSQL custom-format dump (inside container, then copy out) ------
Write-Host "==> pg_dump (custom format) ..."
$tmpIn = "/tmp/erp-backup-$name.dump"
Invoke-Pg $container "pg_dump -U $pgUser -Fc -f $tmpIn $pgDb"
& docker cp "$container`:$tmpIn" $dbFile 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "docker cp failed for dump file" }
Invoke-Pg $container "rm -f $tmpIn"
if (-not (Test-Path $dbFile) -or (Get-Item $dbFile).Length -eq 0) { throw "pg_dump produced an empty file" }
$dbSize = (Get-Item $dbFile).Length
Write-Host "==> DB backup OK: $dbFile ($dbSize bytes)"

# --- 2. Uploads / files archive ----------------------------------------------
$uploadArgs = @('-cf', $filesArchive)
foreach ($d in $uploadDirs) {
    $d = $d.Trim()
    if (-not $d) { continue }
    $abs = if (Split-Path $d -IsAbsolute) { $d } else { Join-Path $script:repoRoot $d }
    if (-not (Test-Path $abs)) { Write-Warning "Upload dir not found, skipping: $abs"; continue }
    $parent = Split-Path $abs -Parent
    $leaf = Split-Path $abs -Leaf
    $uploadArgs += @('-C', $parent, $leaf)
    Write-Host "==> Adding upload dir: $abs"
}
if ($uploadArgs.Count -gt 2) {
    & tar @uploadArgs 2>&1
    if ($LASTEXITCODE -ne 0) { throw "tar failed for uploads archive" }
    Write-Host "==> Files backup OK: $filesArchive"
} else {
    Write-Warning "No upload directories found; files archive not created."
    $filesArchive = $null
}

# --- 3. Retention pruning ----------------------------------------------------
if ($retention -gt 0) {
    $cutoff = (Get-Date).AddDays(-$retention)
    $pruned = @(Get-ChildItem $BackupDir -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "$prefix*" -and $_.LastWriteTime -lt $cutoff })
    foreach ($f in $pruned) { Write-Host "==> Pruning old backup: $($f.Name)"; Remove-Item $f.FullName -Force }
    Write-Host "==> Retention: kept files newer than $cutoff; pruned $($pruned.Count) file(s)"
} else {
    Write-Host "==> Retention: disabled (BACKUP_RETENTION_DAYS=0 keeps all backups)"
}

# --- 4. External / off-server copy ------------------------------------------
if ($externalCmd) {
    Write-Host "==> Running BACKUP_EXTERNAL_COMMAND ..."
    $prevDb = $env:BACKUP_DB_FILE; $prevAr = $env:BACKUP_FILES_ARCHIVE; $prevName = $env:BACKUP_NAME
    $env:BACKUP_DB_FILE = $dbFile
    $env:BACKUP_FILES_ARCHIVE = $filesArchive
    $env:BACKUP_NAME = $name
    try {
        cmd /c $externalCmd 2>&1 | ForEach-Object { Write-Host "    $_" }
        if ($LASTEXITCODE -ne 0) { throw "BACKUP_EXTERNAL_COMMAND failed (exit $LASTEXITCODE)" }
    } finally {
        $env:BACKUP_DB_FILE = $prevDb; $env:BACKUP_FILES_ARCHIVE = $prevAr; $env:BACKUP_NAME = $prevName
    }
    Write-Host "==> External copy OK"
} else {
    Write-Warning "BACKUP_EXTERNAL_COMMAND is not set - backups are stored LOCALLY ONLY. Configure off-server storage for production."
}

Write-Host ""
Write-Host "==> BACKUP COMPLETE (PASS): $name"
Write-Host "    DB:   $dbFile"
if ($filesArchive) { Write-Host "    FILES: $filesArchive" }
exit 0
