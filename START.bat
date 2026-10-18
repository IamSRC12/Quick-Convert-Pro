@echo off
title Quick Convert Pro
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  npm install --prefer-offline
)
echo Starting Quick Convert Pro on http://localhost:5173 ...
start "" http://localhost:5173
node server.js
