# Start the prelegal stack on Windows: build the static frontend on the
# host, then bring up the FastAPI container that serves it.
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Set-Location "$ProjectRoot\frontend"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..."
    npm ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm ci failed (exit $LASTEXITCODE)."
        exit $LASTEXITCODE
    }
}
Write-Host "Building static frontend..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "npm run build failed (exit $LASTEXITCODE)."
    exit $LASTEXITCODE
}

Set-Location $ProjectRoot
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Error "docker compose failed (exit $LASTEXITCODE). Is Docker Desktop running?"
    exit $LASTEXITCODE
}

Write-Host "Prelegal is running at http://localhost:8000"
