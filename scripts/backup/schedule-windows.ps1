# =============================================================================
# El Wataniya ERP - Schedule automated backups (Windows Task Scheduler)
#   Creates a scheduled task that runs scripts\backup\backup.ps1 daily.
#   Run once from an elevated PowerShell (or use the -Force flag to refresh).
#   Frequency is configurable via BACKUP_SCHEDULE_* in backup.env.
# =============================================================================
[CmdletBinding()]
param(
    [string]$TaskName = 'ElWataniyaBackup',
    [switch]$Remove,
    [switch]$Force
)
$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'backup.ps1'
$now = (Get-Date).ToString('HH:mm')

$cfg = @{}
$envFile = Join-Path $PSScriptRoot 'backup.env'
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -and $_ -notmatch '^#' -and $_ -match '=' } | ForEach-Object {
        $p = $_ -split '=', 2
        $cfg[$p[0].Trim()] = $p[1].Trim().Trim('"', "'")
    }
}
$startTime = if ($cfg['BACKUP_SCHEDULE_START_TIME']) { $cfg['BACKUP_SCHEDULE_START_TIME'] } else { $now }
$intervalMin = if ($cfg['BACKUP_SCHEDULE_INTERVAL_MINUTES']) { [int]$cfg['BACKUP_SCHEDULE_INTERVAL_MINUTES'] } else { 1440 }

if ($Remove) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Removed scheduled task '$TaskName' (if it existed)."
    exit 0
}

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing -and -not $Force) {
    Write-Host "Task '$TaskName' already exists. Use -Force to recreate or -Remove to delete."
    exit 0
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Daily -At $startTime
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 3) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 10)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "Scheduled task '$TaskName': daily at $startTime (interval $intervalMin min)."
Write-Host "Backup script: $scriptPath"
Write-Host "Manual run: powershell -ExecutionPolicy Bypass -File `"$scriptPath`""
