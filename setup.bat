@echo off
setlocal
chcp 65001 >nul
title 3D_store setup

echo Installing dependencies...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo Failed to install dependencies.
    pause
    exit /b %errorlevel%
)

echo Starting dev server...
echo URL: http://localhost:3000
echo Press Ctrl+C to stop.
echo.
timeout /t 2 /nobreak >nul

start "" chrome "http://localhost:3000"
call npm run dev -- --host 0.0.0.0 --port 3000

endlocal
