@echo off
setlocal
set "NODE_EXE=%LOCALAPPDATA%\OpenAI\Codex\bin\node.exe"

if not exist "%NODE_EXE%" (
  echo Could not find the bundled Codex Node runtime:
  echo %NODE_EXE%
  echo.
  echo Opening the static HTML file instead.
  start "" "%~dp0index.html"
  exit /b 0
)

cd /d "%~dp0"
start "Jack Kleinick site server" /min "%NODE_EXE%" server.mjs
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4173"
