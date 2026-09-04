@echo off
title Quick Convert Pro (dev server)
cd /d "%~dp0QuickConvertPro"
if not exist node_modules (
  echo Installing dependencies...
  npm install --prefer-offline
)
start "" http://localhost:5173
npm run dev
