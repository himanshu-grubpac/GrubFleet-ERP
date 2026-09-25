# Build Next.js static export and sync to portal S3 + CloudFront invalidation.
# Usage: .\scripts\sync-portal.ps1 -Tier staging [-PortalOrigin https://dxxx.cloudfront.net]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('staging', 'preprod', 'production')]
  [string] $Tier,

  [string] $Profile = 'grubfleet-erp',
  [string] $Region = 'ap-south-1',

  [string] $ApiBaseUrl = '',

  [switch] $SkipBuild
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$StackName = "grubfleet-portal-$Tier"

$bucket = aws cloudformation describe-stacks `
  --stack-name $StackName `
  --query "Stacks[0].Outputs[?OutputKey=='PortalBucketName'].OutputValue | [0]" `
  --output text `
  --profile $Profile `
  --region $Region

$distributionId = aws cloudformation describe-stacks `
  --stack-name $StackName `
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue | [0]" `
  --output text `
  --profile $Profile `
  --region $Region

if (-not $bucket -or $bucket -eq 'None') {
  throw "Stack $StackName missing or no PortalBucketName output. Run deploy-portal-stack.ps1 first."
}

if (-not $ApiBaseUrl) {
  $apiUrls = @{
    staging    = 'https://hyfx146jyh.execute-api.ap-south-1.amazonaws.com/api/v1'
    preprod    = 'https://y5i28pmmk4.execute-api.ap-south-1.amazonaws.com/api/v1'
    production = 'https://ie9a7d5742.execute-api.ap-south-1.amazonaws.com/api/v1'
  }
  $ApiBaseUrl = $apiUrls[$Tier]
}

Push-Location $Root
try {
  if (-not $SkipBuild) {
    Write-Host "Building frontend static export (NEXT_PUBLIC_API_BASE_URL=$ApiBaseUrl)..."
    $env:NEXT_STATIC_EXPORT = 'true'
    $env:NEXT_PUBLIC_API_BASE_URL = $ApiBaseUrl
    npm run build -w frontend
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
  }

  $outDir = Join-Path $Root 'apps\frontend\out'
  if (-not (Test-Path $outDir)) {
    throw "Missing $outDir - run build with NEXT_STATIC_EXPORT=true"
  }

  # Avoid Windows CLI v2 "stream is not seekable" failures on small static files.
  $env:AWS_REQUEST_CHECKSUM_CALCULATION = 'when_required'
  $env:AWS_RESPONSE_CHECKSUM_VALIDATION = 'when_required'

  Write-Host "Syncing to s3://$bucket ..."
  aws s3 sync $outDir "s3://$bucket" --delete --profile $Profile --region $Region
  if ($LASTEXITCODE -ne 0) { throw 'S3 sync failed' }

  Write-Host "Invalidating CloudFront distribution $distributionId ..."
  aws cloudfront create-invalidation `
    --distribution-id $distributionId `
    --paths '/*' `
    --profile $Profile `
    --query 'Invalidation.Id' `
    --output text

  $portalUrl = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --query "Stacks[0].Outputs[?OutputKey=='PortalUrl'].OutputValue | [0]" `
    --output text `
    --profile $Profile `
    --region $Region

  Write-Host "`nPortal live at: $portalUrl"
}
finally {
  Pop-Location
  Remove-Item Env:NEXT_STATIC_EXPORT -ErrorAction SilentlyContinue
}
