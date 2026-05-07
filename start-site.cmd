@echo off
setlocal
set "NODE_EXE=%LOCALAPPDATA%\OpenAI\Codex\bin\node.exe"

if not exist "%NODE_EXE%" (
  echo Could not find the bundled Codex Node runtime:
  echo %NODE_EXE%
  echo.
  echo Install Node.js from https://nodejs.org/ or open index.html directly.
  exit /b 1
)

cd /d "%~dp0"
"%NODE_EXE%" server.mjs
