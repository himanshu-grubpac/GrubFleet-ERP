param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('preprod', 'fleetbeta')]
  [string]$Tier,
  [Parameter(Mandatory = $true)]
  [string]$Email,
  [Parameter(Mandatory = $true)]
  [string]$Password
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$SamConfig = Join-Path $Root "samconfig.$Tier.toml"
$content = Get-Content -Raw -Path $SamConfig
if ($content -match 'DatabaseUrl=\\"([^\\"]+)\\"') {
  $env:DATABASE_URL = $Matches[1]
} else {
  throw "Could not parse DatabaseUrl from $SamConfig"
}

$env:SET_USER_PASSWORD_EMAIL = $Email
$env:SET_USER_PASSWORD_PLAIN = $Password

Push-Location $Root 
try {
  npm run db:set-tier-user-password -w backend
} finally {
  Pop-Location
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:SET_USER_PASSWORD_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:SET_USER_PASSWORD_PLAIN -ErrorAction SilentlyContinue
}
