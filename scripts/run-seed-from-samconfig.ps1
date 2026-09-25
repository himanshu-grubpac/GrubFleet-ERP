param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('staging', 'preprod', 'production')]
  [string]$Tier
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
Push-Location $Root
try {
  npm run db:seed -w backend
} finally {
  Pop-Location
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}
