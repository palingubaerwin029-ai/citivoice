<#
  backup-to-onedrive.ps1
  Copies CitiVoice database backups (backups\db) to a OneDrive folder so a copy
  lives off this PC. Only new/changed files are copied; OneDrive copies older
  than $KeepDays days are pruned.

  Run manually:   powershell -ExecutionPolicy Bypass -File .\backup-to-onedrive.ps1
  Scheduled by:   setup-backup-task.ps1  (Windows Task Scheduler)
#>

param(
    [string]$Source   = (Join-Path $PSScriptRoot 'backups\db'),
    [string]$Dest     = (Join-Path $(if ($env:OneDrive) { $env:OneDrive } else { Join-Path $env:USERPROFILE 'OneDrive' }) 'CitiVoice-Backups'),
    [int]$KeepDays    = 30
)

$ErrorActionPreference = 'Stop'
$LogFile = Join-Path $PSScriptRoot 'backups\onedrive-sync.log'

function Write-Log([string]$msg) {
    $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
    Write-Output $line
    try { Add-Content -Path $LogFile -Value $line } catch {}
}

try {
    if (-not (Test-Path $Source)) { throw "Source folder not found: $Source" }

    $oneDriveRoot = Split-Path $Dest -Parent
    if (-not (Test-Path $oneDriveRoot)) { throw "OneDrive folder not found: $oneDriveRoot" }

    if (-not (Test-Path $Dest)) { New-Item -ItemType Directory -Path $Dest | Out-Null }

    # Copy new or changed backup files (skip hidden state files)
    $copied = 0
    Get-ChildItem -Path $Source -File | Where-Object { $_.Name -notlike '.*' } | ForEach-Object {
        $target = Join-Path $Dest $_.Name
        if (-not (Test-Path $target) -or (Get-Item $target).Length -ne $_.Length) {
            Copy-Item -Path $_.FullName -Destination $target -Force
            $copied++
        }
    }

    # Prune old copies in OneDrive
    $cutoff = (Get-Date).AddDays(-$KeepDays)
    $pruned = 0
    Get-ChildItem -Path $Dest -File | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
        Remove-Item $_.FullName -Force
        $pruned++
    }

    $total = (Get-ChildItem -Path $Dest -File).Count
    Write-Log "OK  copied=$copied pruned=$pruned total_in_onedrive=$total  ->  $Dest"
    exit 0
}
catch {
    Write-Log "FAILED  $($_.Exception.Message)"
    exit 1
}
