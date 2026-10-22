param(
  [Parameter(Mandatory = $true)]
  [string]$Email,
  [Parameter(Mandatory = $true)]
  [string]$Password,
  [string]$FullName = 'Fleet Beta User'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$SamConfig = Join-Path $Root 'samconfig.fleetbeta.toml'
$content = Get-Content -Raw -Path $SamConfig
if ($content -match 'DatabaseUrl=\\"([^\\"]+)\\"') {
  $env:DATABASE_URL = $Matches[1]
} else {
  throw "Could not parse DatabaseUrl from $SamConfig"
}

$env:SEED_USER_EMAIL = $Email
$env:SEED_USER_PASSWORD = $Password
$env:SEED_USER_FULL_NAME = $FullName

Push-Location $Root
try {
  npm run db:seed:fleet-beta-minimal-login -w backend
} finally {
  Pop-Location
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:SEED_USER_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:SEED_USER_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:SEED_USER_FULL_NAME -ErrorAction SilentlyContinue
}
