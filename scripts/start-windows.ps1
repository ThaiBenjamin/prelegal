# Start the prelegal stack (FastAPI + static Next.js export) on Windows.
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Error "docker compose failed (exit $LASTEXITCODE). Is Docker Desktop running?"
    exit $LASTEXITCODE
}

Write-Host "Prelegal is running at http://localhost:8000"
