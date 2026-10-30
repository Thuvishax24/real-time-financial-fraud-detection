@echo off
title FraudGuard AI - Development Mode
echo ===================================================
echo   FraudGuard AI - Development Mode (Hot-Reload)
echo ===================================================
echo.
echo Starting Backend Server (Port 4000) & Vite Frontend (Port 3000)...
echo.

cd /d "%~dp0"

:: Start backend in separate window
start "FraudGuard Server" cmd /k "cd server && npm run dev"

:: Start frontend in separate window
start "FraudGuard Vite Client" cmd /k "cd client && npm run dev"

:: Open browser
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"
