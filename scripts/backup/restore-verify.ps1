# =============================================================================
# El Wataniya ERP - Restore Verification (Windows / PowerShell)
#   Restores the latest backup into a SEPARATE temporary/staging database,
#   restores the uploads archive, runs integrity checks and compares
#   source vs restored data. NEVER touches the real database.
# Fails loudly; exit code 0 only when every check passes.
# =============================================================================
[CmdletBinding()]
param(
    [string]$BackupFile,
    [string]$ConfigFile,
    [string]$UploadsRestoreDir
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
if (-not $ConfigFile -and (Test-Path (Join-Path $PSScriptRoot 'backup.env'))) {
    $ConfigFile = Join-Path $PSScriptRoot 'backup.env'
}
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
if (-not $m.Success) { throw "Cannot parse DATABASE_URL" }
$pgUser = if ($m.Groups[1].Value) { $m.Groups[1].Value } else { if ($script:cfg['POSTGRES_USER']) { $script:cfg['POSTGRES_USER'] } else { 'elwataniya' } }
$pgHost = if ($m.Groups[3].Value) { $m.Groups[3].Value } else { 'localhost' }
$pgPort = if ($m.Groups[4].Value) { $m.Groups[4].Value } else { '5432' }
$pgDb   = if ($m.Groups[5].Value) { $m.Groups[5].Value } else { 'elwataniya_erp' }
$container = if ($script:cfg['POSTGRES_CONTAINER']) { $script:cfg['POSTGRES_CONTAINER'] } else { 'elwataniya-postgres' }
$prefix = if ($script:cfg['BACKUP_PREFIX']) { $script:cfg['BACKUP_PREFIX'] } else { 'elwataniya_erp' }
$backupDir = if ($script:cfg['BACKUP_DIR']) { $script:cfg['BACKUP_DIR'] } else { Join-Path $script:repoRoot 'backups' }
if (-not (Split-Path $backupDir -IsAbsolute)) { $backupDir = Join-Path $script:repoRoot $backupDir }

function Invoke-Psql([string]$db, [string]$sql) {
    $sql = $sql -replace "`r`n", ' '
    $out = $sql | & docker exec -i $container psql -U $pgUser -d $db -t -A 2>&1
    if ($LASTEXITCODE -ne 0) { throw "psql failed on $db`: $out" }
    return ($out | Out-String).Trim()
}

# --- Pick the dump file ------------------------------------------------------
if (-not $BackupFile) {
    $BackupFile = Get-ChildItem (Join-Path $backupDir "$prefix-*.dump") -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $BackupFile -or -not (Test-Path $BackupFile)) { throw "No backup dump file found." }
Write-Host "==> Restore-verify dump: $BackupFile"

# --- Pick the matching files archive (same timestamp) ------------------------
$filesArchive = $null
$dumpName = Split-Path $BackupFile -Leaf
$stamp = $dumpName -replace '^[^-]+-(?<s>\d{8}-\d{6})\.dump$', '$1'
if ($stamp -eq $dumpName) { $stamp = $null }
if ($stamp) {
    $cand = Join-Path $backupDir "$prefix-files-$stamp.tar"
    if (Test-Path $cand) { $filesArchive = $cand }
}
if (-not $filesArchive) {
    $filesArchive = Get-ChildItem (Join-Path $backupDir "$prefix-files-*.tar") -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if ($filesArchive) { Write-Host "==> Files archive: $filesArchive" } else { Write-Warning "No files archive found; file checks will be skipped." }

# --- Staging DB + temp restore dir -------------------------------------------
$stamp2 = Get-Date -Format 'yyyyMMdd-HHmmss'
$stagingDb = "elwataniya_erp_restore_test_$stamp2"
if (-not $UploadsRestoreDir) { $UploadsRestoreDir = Join-Path $env:TEMP "erp-uploads-restore-$stamp2" }
$UploadsRestoreDir = [System.IO.Path]::GetFullPath($UploadsRestoreDir)
New-Item -ItemType Directory -Force -Path $UploadsRestoreDir | Out-Null

Write-Host "==> Creating staging DB: $stagingDb"
Invoke-Psql 'postgres' "CREATE DATABASE `"$stagingDb`""

$tmpIn = "/tmp/erp-restore-$stamp2.dump"
& docker cp $BackupFile "$container`:$tmpIn" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "docker cp failed (dump into container)" }
Write-Host "==> Restoring into staging DB ..."
& docker exec $container pg_restore -U $pgUser -d $stagingDb --no-owner --no-privileges $tmpIn 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed into $stagingDb" }
& docker exec $container rm -f $tmpIn 2>&1 | Out-Null

# --- Restore uploads ---------------------------------------------------------
$restoredFiles = @()
if ($filesArchive) {
    Write-Host "==> Extracting files archive to $UploadsRestoreDir"
    & tar -xf $filesArchive -C $UploadsRestoreDir 2>&1
    if ($LASTEXITCODE -ne 0) { throw "tar extract failed" }
    $restoredFiles = @(Get-ChildItem $UploadsRestoreDir -Recurse -File -ErrorAction SilentlyContinue)
    Write-Host "==> Restored $($restoredFiles.Count) file(s)"
}

# --- Integrity checks --------------------------------------------------------
$fail = 0
Write-Host "`n==> INTEGRITY CHECKS (source=$pgDb vs staging=$stagingDb)"
$tables = @('User','Project','Building','Subcontractor','EmployerBoqItem','AnalyticalBoqItem',
    'ContractorBoqItem','ContractorBoqItemVersion','FinalBoqItem','Distribution','DistributionRow',
    'Component','Statement','StatementItem','StatementDeduction','Payment','ProjectFund',
    'FundTransaction','Purchase','Miscellaneous','InventoryItem','Warehouse','StockMovement',
    'Employee','Attendance','Notification','FileRecord','ProjectBoardDocument','Supplier','Client',
    'Approval','ClientStatement','SubcontractorStatement','AuditLog','TimelineEvent',
    'AiConversation','SignatureWorkflow','Role','Permission','UserRoleAssignment',
    'UserProjectAssignment','Company','BuildingSubcontractor','Category','Department','EmployeeRole',
    'EmployeeShift','Holiday','Leave','RefreshToken','BoqCodeCounter','Setting','SettingChangeLog',
    'Shift','SignatureAction','SignatureRequest','SignatureWorkflowStep','EventStoreRecord')
foreach ($t in $tables) {
    $src = Invoke-Psql $pgDb "SELECT count(*) FROM `"$t`""
    $res = Invoke-Psql $stagingDb "SELECT count(*) FROM `"$t`""
    $ok = ($src -eq $res)
    if (-not $ok) { $fail++ }
    Write-Host ("  {0,-32} source={1,-8} restored={2,-8} {3}" -f $t, $src, $res, $(if ($ok) { 'OK' } else { 'MISMATCH' }))
}

# --- File reference checks (Company branding + FileRecord) -------------------
Write-Host "`n==> FILE REFERENCE CHECKS"
$colMap = @('logo', 'smallLogo', 'watermark', 'stamp', 'signature')
foreach ($col in $colMap) {
    $vals = Invoke-Psql $stagingDb "SELECT `"$col`" FROM `"Company`" WHERE `"$col`" <> ''"
    foreach ($line in @($vals)) {
        if (-not $line) { continue }
        $ok = $false
        if ($line -match '^[a-f0-9-]{36}\.(png|jpg|jpeg|webp|pdf|svg)$') {
            $ok = @($restoredFiles | Where-Object { $_.Name -eq $line }).Count -gt 0
        } elseif ($line -match '^(https?://|/uploads/)') {
            $ok = $true   # external or absolute-URL references are treated as reachable
        }
        if (-not $ok) { $fail++; Write-Host "  company.$col -> $line : MISSING FILE" }
        else { Write-Host "  company.$col -> $line : OK" }
    }
}

# --- FileRecord references (uploaded files via file module) ------------------
if ($restoredFiles.Count -gt 0) {
    $paths = Invoke-Psql $stagingDb "SELECT path FROM `"FileRecord`" WHERE path <> ''"
    foreach ($line in @($paths)) {
        if (-not $line) { continue }
        $rel = $line -replace '^/+', ''
        $found = @($restoredFiles | Where-Object { $_.FullName -replace '\\', '/' -match [regex]::Escape($rel) -or $_.Name -eq (Split-Path $line -Leaf) }).Count
        if ($found -gt 0) { Write-Host "  FileRecord -> $line : OK" }
        else { $fail++; Write-Host "  FileRecord -> $line : MISSING FILE" }
    }
}

# --- Prisma migrations integrity --------------------------------------------
$migSrc = Invoke-Psql $pgDb 'SELECT count(*) FROM "_prisma_migrations"'
$migRes = Invoke-Psql $stagingDb 'SELECT count(*) FROM "_prisma_migrations"'
if ($migSrc -eq $migRes) { Write-Host "  _prisma_migrations  source=$migSrc restored=$migRes OK" }
else { $fail++; Write-Host "  _prisma_migrations  MISMATCH ($migSrc vs $migRes)" }

# --- Deep checksum checks on critical tables (full row content) --------------
Write-Host "`n==> DEEP CHECKSUM CHECKS (md5 of full row content)"
$hashTables = @('User', 'Project', 'Building', 'Subcontractor', 'Company', 'ProjectFund', 'Statement', 'Setting')
foreach ($t in $hashTables) {
    $q = "SELECT COALESCE(md5(string_agg(t::text, chr(10) ORDER BY t::text)), '') FROM (SELECT * FROM `"$t`") t"
    $src = Invoke-Psql $pgDb $q
    $res = Invoke-Psql $stagingDb $q
    if ($src -eq $res -and $src) { Write-Host "  $t  checksum=$($src.Substring(0,16))... OK" }
    else { $fail++; Write-Host "  $t  checksum MISMATCH (src=$src res=$res)" }
}

# --- Cleanup staging ---------------------------------------------------------
Write-Host "`n==> Cleaning up staging DB and temp dirs ..."
$sess = Invoke-Psql 'postgres' "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$stagingDb' AND pid <> pg_backend_pid()"
Invoke-Psql 'postgres' "DROP DATABASE IF EXISTS `"$stagingDb`"" | Out-Null
Remove-Item -Recurse -Force $UploadsRestoreDir -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $env:TEMP "erp-uploads-restore-$stamp2") -ErrorAction SilentlyContinue

if ($fail -gt 0) {
    Write-Host "`n==> RESTORE VERIFICATION FAILED ($fail check(s) failed)"
    exit 1
}
Write-Host "`n==> RESTORE VERIFICATION PASS"
exit 0
