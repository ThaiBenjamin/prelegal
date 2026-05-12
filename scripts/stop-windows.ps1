# Stop the prelegal stack on Windows.
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

docker compose down
if ($LASTEXITCODE -ne 0) {
    Write-Error "docker compose down failed (exit $LASTEXITCODE). Is Docker Desktop running?"
    exit $LASTEXITCODE
}
