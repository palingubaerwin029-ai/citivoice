<#
  setup-backup-task.ps1
  Registers a Windows Task Scheduler job that runs backup-to-onedrive.ps1
  every day at the chosen time (and shortly after logon, in case the PC was off).

  Usage:  powershell -ExecutionPolicy Bypass -File .\setup-backup-task.ps1
          powershell -ExecutionPolicy Bypass -File .\setup-backup-task.ps1 -Time "22:00"
  Remove: Unregister-ScheduledTask -TaskName "CitiVoice OneDrive Backup" -Confirm:$false
#>

param(
    [string]$Time = '23:00',
    [string]$TaskName = 'CitiVoice OneDrive Backup'
)

$script = Join-Path $PSScriptRoot 'backup-to-onedrive.ps1'
if (-not (Test-Path $script)) { throw "Not found: $script" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`"" `
    -WorkingDirectory $PSScriptRoot

$daily = New-ScheduledTaskTrigger -Daily -At $Time
$logon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$logon.Delay = 'PT5M'

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($daily, $logon) `
    -Settings $settings -Description 'Copies CitiVoice DB backups to OneDrive' -Force | Out-Null

Write-Output "Task '$TaskName' registered: daily at $Time and 5 min after logon."
