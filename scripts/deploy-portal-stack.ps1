# Deploy grubfleet-portal-{tier} CloudFormation stack (S3 + CloudFront OAC).
# Usage: .\scripts\deploy-portal-stack.ps1 -Tier staging
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('staging', 'preprod', 'production')]
  [string] $Tier,

  [string] $Profile = 'grubfleet-erp',
  [string] $Region = 'ap-south-1'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Template = Join-Path $Root 'infrastructure\grubfleet-portal.yaml'
$StackName = "grubfleet-portal-$Tier"

Write-Host "Deploying stack $StackName in $Region (profile $Profile)..."

aws cloudformation deploy `
  --template-file $Template `
  --stack-name $StackName `
  --parameter-overrides "Environment=$Tier" `
  --no-fail-on-empty-changeset `
  --profile $Profile `
  --region $Region

Write-Host "`nStack outputs:"
aws cloudformation describe-stacks `
  --stack-name $StackName `
  --query 'Stacks[0].Outputs' `
  --output table `
  --profile $Profile `
  --region $Region

$portalUrl = aws cloudformation describe-stacks `
  --stack-name $StackName `
  --query "Stacks[0].Outputs[?OutputKey=='PortalUrl'].OutputValue | [0]" `
  --output text `
  --profile $Profile `
  --region $Region

Write-Host "`nPortal URL: $portalUrl"
Write-Host "Next: update SAM ClientOrigin - .\scripts\update-sam-client-origin.ps1 -Tier $Tier -PortalOrigin $portalUrl"
