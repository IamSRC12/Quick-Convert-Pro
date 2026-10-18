@echo off
title Quick Convert Pro
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js not found. Install it from https://nodejs.org & pause & exit /b 1)
if not exist node_modules (
  echo Installing dependencies...
  call npm install --prefer-offline
)
echo Starting Quick Convert Pro on http://localhost:5173 ...
start "Quick Convert Pro server" /min cmd /c "node server.js"
timeout /t 2 /nobreak >nul
start "" http://localhost:5173
