@echo off
setlocal
cd /d "%~dp0"
start "Jack Kleinick site server" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4173"
