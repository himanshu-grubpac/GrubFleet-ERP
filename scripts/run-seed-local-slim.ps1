# Local slim org + asset seed (Docker Postgres, development only).
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$env:APP_ENV = "development"
if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp"
}

Write-Host "Running migrations (if pending)..."
npm run db:migrate -w backend

Write-Host "Seeding slim local org + asset data..."
npm run db:seed -w backend
