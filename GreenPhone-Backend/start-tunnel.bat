@echo off
REM ============================================================
REM start-tunnel.bat — GreenPhone Backend + Cloudflared Tunnel
REM ============================================================
setlocal enabledelayedexpansion

set "COMPOSE_FILE=%~dp0docker-compose.yml"

echo ==========================================
echo  GreenPhone Backend + Cloudflared Tunnel
echo ==========================================
echo.

echo [1/2] Starting backend + tunnel...
docker compose -f "%COMPOSE_FILE%" up -d --build

echo.
echo [2/2] Waiting for tunnel URL...
echo.

set /a ELAPSED=0
set TIMEOUT=60
set "TUNNEL_URL="

:loop
if %ELAPSED% geq %TIMEOUT% goto :done

REM Lấy URL từ log tunnel container
for /f "delims=" %%a in ('docker logs greenphone-tunnel 2^>^&1 ^| findstr /R "https://[a-zA-Z0-9-]*\.trycloudflare\.com"') do (
    set "TUNNEL_URL=%%a"
)

if not "!TUNNEL_URL!"=="" goto :done

timeout /t 2 /nobreak >nul
set /a ELAPSED+=2
<nul set /p "=."
goto :loop

:done
echo.
echo.

if not "!TUNNEL_URL!"=="" (
    echo ==========================================
    echo   TUNNEL READY
    echo ==========================================
    echo.
    echo   Tunnel URL: !TUNNEL_URL!
    echo   API Docs:   !TUNNEL_URL!/swagger-ui.html
    echo   Local:      http://localhost:8080
    echo.
    echo ==========================================
    echo.
    echo To stop: docker compose -f "%COMPOSE_FILE%" down
) else (
    echo WARNING: Timed out waiting for tunnel URL (%TIMEOUT%s^)
    echo Check logs manually: docker logs greenphone-tunnel
)

endlocal
