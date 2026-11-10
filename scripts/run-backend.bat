@echo off
chcp 65001 >nul
echo ============================================================
echo   GREENPHONE - KHOI DONG BACKEND VA TU DONG CHAY MIGRATION
echo ============================================================

cd /d "%~dp0\..\GreenPhone-Backend"

rem 1. Kiem tra file .env
if not exist ".env" (
    echo [INFO] File .env chua ton tai. Dang sao chep tu .env.example...
    copy ".env.example" ".env" >nul
    echo [OK] Da tao file .env tu .env.example.
)

rem 2. Kiem tra Docker Redis (neu dang su dung docker)
docker ps -a --format "{{.Names}}" 2>nul | findstr /i "greenphone-redis" >nul
if %ERRORLEVEL% equ 0 (
    docker ps --format "{{.Names}}" 2>nul | findstr /i "greenphone-redis" >nul
    if %ERRORLEVEL% neq 0 (
        echo [INFO] Dang khoi dong container Redis: greenphone-redis...
        docker start greenphone-redis >nul 2>&1
    )
)

echo.
echo [INFO] Dang bien dich va khoi dong Spring Boot Backend...
echo [INFO] Flyway se tu dong kiem tra va chay tat ca migration con thieu trong db/migration.
echo.

call gradlew.bat bootRun

pause
