# Start the prelegal stack (FastAPI + static Next.js export) on Windows.
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
docker compose up -d --build
Write-Host "Prelegal is running at http://localhost:8000"
