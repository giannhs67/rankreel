@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 LTS or newer, then reopen this file.
  pause
  exit /b 1
)
node scripts/start-local.mjs
if errorlevel 1 pause
