@echo off
setlocal enabledelayedexpansion

:: Set filename with current timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (
    set mytime=%%a%%b
    set mytime=!mytime: =0!
)
set BACKUP_FILE=backups\backup_!mydate!_!mytime!.sql

echo [CitiVoice] Starting manual database backup...
docker exec -i citivoice-mysql mysqldump -u root -proot citivoice > "%BACKUP_FILE%"

if %ERRORLEVEL% equ 0 (
    echo [CitiVoice] ✅ Backup created successfully: %BACKUP_FILE%
) else (
    echo [CitiVoice] ❌ Backup failed. Ensure docker-compose is running.
)

pause
