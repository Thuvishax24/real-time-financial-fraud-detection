@echo off
title FraudGuard AI - Real-Time Fraud Detection System
echo ===================================================
echo   FraudGuard AI - Real-Time Transaction Monitoring
echo ===================================================
echo.
echo Starting backend server on http://localhost:4000 ...
echo.

cd /d "%~dp0server"

:: Check if node_modules exists, if not install
if not exist "node_modules\" (
    echo Installing backend dependencies...
    call npm install
)

:: Start server in background window or current window
start "" "http://localhost:4000"
node src/index.js
pause
