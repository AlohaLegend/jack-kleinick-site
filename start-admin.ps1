$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Candidates = @()

$PathNode = (Get-Command node -ErrorAction SilentlyContinue)
if ($PathNode) {
  $Candidates += $PathNode.Source
}

$Candidates += @(
  "$env:LOCALAPPDATA\OpenAI\Codex\bin\node.exe",
  "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)

$Node = $Candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $Node) {
  Write-Host "Node.js is required for the admin backend."
  Write-Host "Install Node.js LTS, then run start-admin.cmd again."
  exit 1
}

$BundledModules = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules"
if (Test-Path $BundledModules) {
  $env:NODE_PATH = $BundledModules
}

$Port = if ($env:ADMIN_PORT) { $env:ADMIN_PORT } else { "4184" }

Write-Host "Starting Jack Kleinick admin with: $Node"
Write-Host "Admin URL: http://127.0.0.1:$Port/admin/"
Write-Host ""
& $Node "$Root\admin-server.mjs"
