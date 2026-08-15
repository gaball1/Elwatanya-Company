# =============================================================================
# El Wataniya ERP - Disaster Recovery restore (Windows / PowerShell)
#   DANGER: restores OVER the real database. Manual, operator-confirmed only.
#   Restores the chosen dump into the real database and the files archive into
#   the configured upload directories. Always back up the current state first.
# =============================================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$BackupFile,
    [switch]$FilesOnly,
    [switch]$SkipFiles,
    [string]$ConfigFile,
    [switch]$Yes
)
$ErrorActionPreference = 'Stop'
$script:repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$script:cfg = @{}
function Read-ConfigFile([string]$path) {
    if ($path -and (Test-Path $path)) {
        Get-Content $path | Where-Object { $_ -and $_ -notmatch '^#' -and $_ -match '=' } | ForEach-Object {
            $parts = $_ -split '=', 2
            $script:cfg[$parts[0].Trim()] = $parts[1].Trim().Trim('"', "'")
        }
    }
}
if (-not $ConfigFile -and (Test-Path (Join-Path $PSScriptRoot 'backup.env'))) { $ConfigFile = Join-Path $PSScriptRoot 'backup.env' }
Read-ConfigFile $ConfigFile
$backendEnv = Join-Path $script:repoRoot 'backend\.env'
if (Test-Path $backendEnv) {
    Get-Content $backendEnv | Where-Object { $_ -match '^DATABASE_URL=' } | ForEach-Object {
        $script:cfg['DATABASE_URL'] = ($_ -split '=', 2)[1].Trim().Trim('"', "'")
    }
}
$dbUrl = if ($script:cfg['DATABASE_URL']) { $script:cfg['DATABASE_URL'] } else { 'postgresql://localhost:5432/elwataniya_erp' }
$re = '^postgres(?:ql)?://(?:([^:/@]+):([^@/]*)@)?([^:/@]+):?(\d+)?/([^?]+)'
$m = [regex]::Match($dbUrl, $re)
$pgUser = if ($m.Groups[1].Value) { $m.Groups[1].Value } else { 'elwataniya' }
$pgDb = if ($m.Groups[5].Value) { $m.Groups[5].Value } else { 'elwataniya_erp' }
$container = if ($script:cfg['POSTGRES_CONTAINER']) { $script:cfg['POSTGRES_CONTAINER'] } else { 'elwataniya-postgres' }
$prefix = if ($script:cfg['BACKUP_PREFIX']) { $script:cfg['BACKUP_PREFIX'] } else { 'elwataniya_erp' }
$backupDir = if ($script:cfg['BACKUP_DIR']) { $script:cfg['BACKUP_DIR'] } else { Join-Path $script:repoRoot 'backups' }
if (-not (Split-Path $backupDir -IsAbsolute)) { $backupDir = Join-Path $script:repoRoot $backupDir }
$uploadDirs = if ($script:cfg['BACKUP_UPLOAD_DIRS']) { $script:cfg['BACKUP_UPLOAD_DIRS'] -split ',' } else { @('backend/uploads', 'uploads') }

if (-not $Yes) {
    Write-Host "WARNING: This will OVERWRITE the real database '$pgDb' and upload directories." -ForegroundColor Red
    $ans = Read-Host "Type 'RESTORE' to continue"
    if ($ans -ne 'RESTORE') { Write-Host "Aborted."; exit 1 }
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$tmpIn = "/tmp/erp-dr-$stamp.dump"

if (-not $SkipFiles) {
    $filesArchive = Join-Path $backupDir "$prefix-files-$stamp.tar"
    $base = Split-Path $BackupFile -Leaf
    $st = $base -replace '^[^-]+-(?<s>\d{8}-\d{6})\.dump$', '$1'
    if ($st -ne $base -and (Test-Path (Join-Path $backupDir "$prefix-files-$st.tar"))) { $filesArchive = Join-Path $backupDir "$prefix-files-$st.tar" }
    if (Test-Path $filesArchive) {
        Write-Host "==> Restoring uploads from $filesArchive"
        & tar -xf $filesArchive -C (Split-Path $script:repoRoot -Parent) 2>&1
        if ($LASTEXITCODE -ne 0) { throw "tar restore failed" }
        Write-Host "==> Uploads restored."
    } else {
        Write-Warning "Files archive not found for this dump; uploads NOT restored."
    }
}

function Invoke-Psql([string]$db, [string]$sql) {
    $out = $sql | & docker exec -i $container psql -U $pgUser -d $db -t -A 2>&1
    if ($LASTEXITCODE -ne 0) { throw "psql failed on $db`: $out" }
    return ($out | Out-String).Trim()
}

if (-not $FilesOnly) {
    Write-Host "==> Dropping and recreating database '$pgDb' (data loss on current DB)."
    Invoke-Psql 'postgres' "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$pgDb' AND pid<>pg_backend_pid()" | Out-Null
    Invoke-Psql 'postgres' "DROP DATABASE IF EXISTS `"$pgDb`"" | Out-Null
    Invoke-Psql 'postgres' "CREATE DATABASE `"$pgDb`"" | Out-Null
    & docker cp $BackupFile "$container`:$tmpIn" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "docker cp failed" }
    & docker exec $container pg_restore -U $pgUser -d $pgDb --no-owner --no-privileges $tmpIn 2>&1
    if ($LASTEXITCODE -ne 0) { throw "pg_restore failed" }
    & docker exec $container rm -f $tmpIn 2>&1 | Out-Null
    Write-Host "==> Database restored from $BackupFile"
}
Write-Host "==> DR RESTORE COMPLETE"
exit 0
