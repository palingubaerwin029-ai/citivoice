@echo off
echo [CitiVoice] Database Restore Utility
echo ----------------------------------
set /p BACKUP_PATH="Enter the path to your backup .sql file (or drag and drop it here): "

:: Remove quotes if they exist from drag and drop
set BACKUP_PATH=%BACKUP_PATH:"=%

if not exist "%BACKUP_PATH%" (
    echo [CitiVoice] ❌ Error: File does not exist at "%BACKUP_PATH%"
    pause
    exit /b 1
)

echo [CitiVoice] Restoring database from: %BACKUP_PATH%...
docker exec -i citivoice-mysql mysql -u root -proot citivoice < "%BACKUP_PATH%"

if %ERRORLEVEL% equ 0 (
    echo [CitiVoice] ✅ Database restored successfully!
) else (
    echo [CitiVoice] ❌ Restore failed. Ensure docker-compose is running.
)

pause
