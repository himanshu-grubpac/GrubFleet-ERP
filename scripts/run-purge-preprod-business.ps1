$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$SamConfig = Join-Path $Root 'samconfig.preprod.toml'
$content = Get-Content -Raw -Path $SamConfig
if ($content -match 'DatabaseUrl=\\"([^\\"]+)\\"') {
  $env:DATABASE_URL = $Matches[1]
} else {
  throw "Could not parse DatabaseUrl from $SamConfig"
}

$env:APP_ENV = 'preprod'
$env:PURGE_PREPROD_BUSINESS = '1'

Push-Location $Root
try {
  npm run db:purge:preprod-business -w backend
} finally {
  Pop-Location
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:APP_ENV -ErrorAction SilentlyContinue
  Remove-Item Env:PURGE_PREPROD_BUSINESS -ErrorAction SilentlyContinue
}
