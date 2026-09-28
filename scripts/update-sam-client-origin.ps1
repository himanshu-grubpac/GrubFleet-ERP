# Set SAM ClientOrigin (CORS) to the hosted portal URL and redeploy API stack.
# Usage:
#   .\scripts\update-sam-client-origin.ps1 -Tier staging
#   .\scripts\update-sam-client-origin.ps1 -Tier staging -PortalOrigin https://dxxx.cloudfront.net
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('staging', 'preprod', 'production')]
  [string] $Tier,

  [string] $PortalOrigin = '',

  [string] $Profile = 'grubfleet-erp',
  [string] $Region = 'ap-south-1',

  [switch] $ConfigOnly
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$SamConfig = Join-Path $Root "samconfig.$Tier.toml"

if (-not $PortalOrigin) {
  $portalStack = "grubfleet-portal-$Tier"
  $PortalOrigin = aws cloudformation describe-stacks `
    --stack-name $portalStack `
    --query "Stacks[0].Outputs[?OutputKey=='PortalUrl'].OutputValue | [0]" `
    --output text `
    --profile $Profile `
    --region $Region
  if (-not $PortalOrigin -or $PortalOrigin -eq 'None') {
    throw "Could not read PortalUrl from $portalStack. Pass -PortalOrigin explicitly."
  }
}

$PortalOrigin = $PortalOrigin.TrimEnd('/')
# Staging/pre-prod: portal + local Next dev; production: hosted portal only.
$ClientOriginValue = if ($Tier -eq 'production') {
  $PortalOrigin
} else {
  "$PortalOrigin,http://localhost:3000"
}
Write-Host "ClientOrigin (CORS): $ClientOriginValue"

if (-not (Test-Path $SamConfig)) {
  throw "Missing $SamConfig - copy from samconfig.$Tier.example.toml and fill secrets."
}

$content = Get-Content -Raw -Path $SamConfig
# CommaDelimitedList: unquoted in parameter_overrides (quoted value = single broken origin).
$replacement = "ClientOrigin=$ClientOriginValue"
$updated = $content -replace 'ClientOrigin=\\"[^\\"]*\\"', $replacement
if ($updated -eq $content) {
  $updated = $content -replace 'ClientOrigin="[^"]*"', $replacement
}
if ($updated -eq $content) {
  $updated = $content -replace 'ClientOrigin=[^\s"]+', $replacement
}
if ($updated -eq $content) {
  Write-Warning 'Could not find ClientOrigin in samconfig; add manually (unquoted, comma-separated).'
}
else {
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($SamConfig, $updated, $utf8NoBom)
  Write-Host "Updated $SamConfig"
}

if ($ConfigOnly) {
  return
}

Push-Location $Root
try {
  Write-Host 'Redeploying SAM API (prepare + deploy)...'
  npm run "deploy:${Tier}:api"
}
finally {
  Pop-Location
}
