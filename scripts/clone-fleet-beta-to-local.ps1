# Clone fleet-beta RDS business data into local Docker Postgres (read-only source).
# Preserves local dev login via run-local-dev-admin-bootstrap-only after restore.
#
# Usage:
#   $env:SOURCE_DATABASE_URL = 'postgresql://...grubfleet_erp_fleet_beta?sslmode=require'  # optional
#   .\scripts\clone-fleet-beta-to-local.ps1
#
# SOURCE falls back to DatabaseUrl in samconfig.fleetbeta.toml (gitignored) when env unset.

param(
  [string]$TargetDatabaseUrl = 'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp',
  [switch]$SkipMigrate,
  [switch]$SkipAdminBootstrap
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$SamConfig = Join-Path $Root 'samconfig.fleetbeta.toml'

$SOURCE_DB_MARKER = 'grubfleet_erp_fleet_beta'
$TARGET_DB_MARKER = 'grubpac_erp'

function Get-DatabaseNameFromUrl([string]$Url) {
  $normalized = $Url -replace '^postgresql:', 'postgres:'
  $parsed = [Uri]$normalized
  return $parsed.AbsolutePath.TrimStart('/').Split('?')[0]
}

function Get-HostFromUrl([string]$Url) {
  $normalized = $Url -replace '^postgresql:', 'postgres:'
  $parsed = [Uri]$normalized
  return $parsed.Host
}

function Assert-SourceUrl([string]$Url) {
  if ([string]::IsNullOrWhiteSpace($Url)) {
    throw 'SOURCE_DATABASE_URL is empty. Set $env:SOURCE_DATABASE_URL or create samconfig.fleetbeta.toml with DatabaseUrl.'
  }
  $db = Get-DatabaseNameFromUrl $Url
  if ($db -ne $SOURCE_DB_MARKER) {
    throw "Refusing clone: source database must be $SOURCE_DB_MARKER, got $db"
  }
  if ($Url -match 'grubfleet_erp_production|/production') {
    throw 'Refusing clone: source looks like production.'
  }
}

function Assert-TargetUrl([string]$Url) {
  $db = Get-DatabaseNameFromUrl $Url
  if ($db -ne $TARGET_DB_MARKER) {
    throw "Refusing clone: target database must be $TARGET_DB_MARKER, got $db"
  }
  $dbHost = Get-HostFromUrl $Url
  if ($dbHost -notin @('localhost', '127.0.0.1')) {
    throw "Refusing clone: target host must be localhost, got $dbHost"
  }
}

function Resolve-SourceDatabaseUrl {
  if ($env:SOURCE_DATABASE_URL) {
    return $env:SOURCE_DATABASE_URL.Trim()
  }
  if (-not (Test-Path $SamConfig)) {
    throw "SOURCE_DATABASE_URL not set and $SamConfig not found."
  }
  $content = Get-Content -Raw -Path $SamConfig
  if ($content -match 'DatabaseUrl=\\"([^\\"]+)\\"') {
    return $Matches[1]
  }
  throw "Could not parse DatabaseUrl from $SamConfig"
}

function Ensure-PostgresContainer {
  Push-Location $Root
  try {
    $running = docker ps --filter 'name=grubpac-erp-postgres' --format '{{.Names}}'
    if (-not $running) {
      Write-Host 'Starting Docker Postgres (docker compose up -d postgres)...'
      docker compose up -d postgres | Out-Null
      $deadline = (Get-Date).AddMinutes(2)
      while ((Get-Date) -lt $deadline) {
        $health = docker inspect --format '{{.State.Health.Status}}' grubpac-erp-postgres 2>$null
        if ($health -eq 'healthy') { return }
        Start-Sleep -Seconds 2
      }
      throw 'Postgres container did not become healthy in time.'
    }
  } finally {
    Pop-Location
  }
}

function Reset-LocalDatabase {
  Write-Host 'Resetting local database grubpac_erp (terminate connections, drop, create)...'
  docker exec grubpac-erp-postgres psql -U grubpac -d postgres -v ON_ERROR_STOP=1 -c `
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TARGET_DB_MARKER' AND pid <> pg_backend_pid();" | Out-Null
  docker exec grubpac-erp-postgres psql -U grubpac -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $TARGET_DB_MARKER;" | Out-Null
  docker exec grubpac-erp-postgres psql -U grubpac -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $TARGET_DB_MARKER OWNER grubpac;" | Out-Null
}

function Invoke-PgDumpFleetBeta([string]$SourceUrl, [string]$DumpDir) {
  $dumpFileName = 'fleet_beta.dump'
  $hostDumpPath = Join-Path $DumpDir $dumpFileName
  Write-Host "Dumping fleet-beta (custom format, read-only) to $hostDumpPath ..."
  if (-not (Test-Path $DumpDir)) {
    New-Item -ItemType Directory -Path $DumpDir -Force | Out-Null
  }
  # Mount a directory (not a single file) — Docker Desktop on Windows treats file binds as directories.
  docker run --rm `
    -v "${DumpDir}:/dumps" `
    postgres:18-alpine `
    pg_dump "$SourceUrl" -Fc --no-owner --no-acl -f "/dumps/$dumpFileName"
  if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed with exit code $LASTEXITCODE"
  }
  if (-not (Test-Path $hostDumpPath) -or (Get-Item $hostDumpPath).Length -lt 1024) {
    throw 'pg_dump did not produce a valid dump file.'
  }
  return $hostDumpPath
}

function Invoke-PgRestoreLocal([string]$DumpDir, [string]$DumpFileName) {
  $restoreUrl = 'postgresql://grubpac:grubpac_dev@host.docker.internal:5432/grubpac_erp'
  Write-Host 'Restoring into local Docker Postgres...'
  docker run --rm `
    -v "${DumpDir}:/dumps:ro" `
    --add-host=host.docker.internal:host-gateway `
    postgres:18-alpine `
    pg_restore --no-owner --no-acl --verbose -d $restoreUrl "/dumps/$DumpFileName"
  if ($LASTEXITCODE -ne 0) {
    throw "pg_restore failed with exit code $LASTEXITCODE"
  }
}

function Get-LocalRowCounts {
  $sql = @"
SELECT 'organizations' AS entity, COUNT(*)::text AS n FROM organizations
UNION ALL SELECT 'users', COUNT(*)::text FROM users
UNION ALL SELECT 'asset_register_vehicles', COUNT(*)::text FROM asset_register_vehicles
UNION ALL SELECT 'lease_contracts', COUNT(*)::text FROM lease_contracts;
"@
  docker exec grubpac-erp-postgres psql -U grubpac -d grubpac_erp -t -A -F '|' -c $sql
}

$sourceUrl = Resolve-SourceDatabaseUrl
Assert-SourceUrl $sourceUrl
Assert-TargetUrl $TargetDatabaseUrl

Ensure-PostgresContainer

$dumpDir = Join-Path $env:TEMP "grubfleet_fleet_beta_clone_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
$dumpFileName = 'fleet_beta.dump'
try {
  $dumpPath = Invoke-PgDumpFleetBeta -SourceUrl $sourceUrl -DumpDir $dumpDir
  Reset-LocalDatabase
  Invoke-PgRestoreLocal -DumpDir $dumpDir -DumpFileName $dumpFileName

  if (-not $SkipMigrate) {
    Write-Host 'Running Drizzle migrate on local target...'
    Push-Location $Root
    try {
      $env:DATABASE_URL = $TargetDatabaseUrl
      npm run db:migrate -w backend
    } finally {
      Pop-Location
      Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    }
  }

  if (-not $SkipAdminBootstrap) {
    Write-Host 'Re-applying local dev admin bootstrap (admin@grubpac.local / Grubpac123)...'
    Push-Location $Root
    try {
      $env:DATABASE_URL = $TargetDatabaseUrl
      npm run db:bootstrap:local-admin-only -w backend
    } finally {
      Pop-Location
      Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    }
  }

  Write-Host ''
  Write-Host 'Sanity row counts (local):'
  Get-LocalRowCounts | ForEach-Object { Write-Host "  $_" }
  Write-Host ''
  Write-Host 'Done. Login: admin@grubpac.local / Grubpac123 (org: GrubPac Dev Organization / grubpac-dev).'
  Write-Host 'Fleet-beta orgs and module data are mirrored; use x-organization-id for non-dev orgs in API.'
} finally {
  if (Test-Path $dumpDir) {
    Remove-Item -Recurse -Force $dumpDir -ErrorAction SilentlyContinue
  }
}
