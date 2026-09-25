# Local-only: provisions data tiers and writes gitignored samconfig.*.toml (secrets).
# Usage: pwsh -File scripts/deploy-grubfleet-data-and-samconfig.ps1 [-SkipDeploy]
param(
  [string]$Profile = 'grubfleet-erp',
  [string]$Region = 'ap-south-1',
  [string]$MigrationCidr = '106.192.124.79/32',
  [switch]$SkipDeploy
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$DataTemplate = Join-Path $Root 'infrastructure/grubfleet-data-tier.yaml'
$MetaFile = Join-Path $Root '.aws-deploy-meta.local.json'

function New-Secret([int]$Length = 48) {
  $bytes = New-Object byte[] $Length
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  [Convert]::ToBase64String($bytes) -replace '[+/=]', 'x'
}

function New-DbPassword() {
  -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 28 | ForEach-Object { [char]$_ })
}

$network = aws cloudformation describe-stacks --profile $Profile --region $Region --stack-name grubfleet-network `
  --query 'Stacks[0].Outputs' --output json | ConvertFrom-Json
$privA = ($network | Where-Object OutputKey -eq 'PrivateSubnetAId').OutputValue
$privB = ($network | Where-Object OutputKey -eq 'PrivateSubnetBId').OutputValue
$lambdaSg = ($network | Where-Object OutputKey -eq 'LambdaSecurityGroupId').OutputValue
$vpcSubnets = "$privA,$privB"

$tiers = @(
  @{ Name = 'staging'; AppEnv = 'staging'; Stack = 'grubfleet-data-staging'; ApiStack = 'grubfleet-api-staging'; Fn = 'grubfleet-api-staging'; PublicRds = 'true'; Warmup = 'false'; Concurrency = '0'; ClientOrigin = 'http://localhost:3000' },
  @{ Name = 'preprod'; AppEnv = 'preprod'; Stack = 'grubfleet-data-preprod'; ApiStack = 'grubfleet-api-preprod'; Fn = 'grubfleet-api-preprod'; PublicRds = 'false'; Warmup = 'true'; Concurrency = '10'; ClientOrigin = 'https://localhost' },
  @{ Name = 'production'; AppEnv = 'production'; Stack = 'grubfleet-data-production'; ApiStack = 'grubfleet-api-production'; Fn = 'grubfleet-api-production'; PublicRds = 'false'; Warmup = 'true'; Concurrency = '40'; ClientOrigin = 'https://localhost' }
)

$meta = @{ tiers = @{}; vpc = @{ subnets = $vpcSubnets; lambdaSg = $lambdaSg } }

foreach ($t in $tiers) {
  $dbPwd = New-DbPassword
  $jwtAccess = New-Secret 48
  $jwtRefresh = New-Secret 48

  if (-not $SkipDeploy) {
    $overrides = @(
      "Tier=$($t.Name)",
      "DbMasterPassword=$dbPwd",
      "RdsPubliclyAccessible=$($t.PublicRds)"
    )
    if ($t.PublicRds -eq 'true' -and $MigrationCidr) {
      $overrides += "MigrationClientCidr=$MigrationCidr"
    }
    aws cloudformation deploy `
      --profile $Profile `
      --region $Region `
      --stack-name $t.Stack `
      --template-file $DataTemplate `
      --parameter-overrides @overrides `
      --no-fail-on-empty-changeset | Out-Null
  }

  $outs = aws cloudformation describe-stacks --profile $Profile --region $Region --stack-name $t.Stack `
    --query 'Stacks[0].Outputs' --output json | ConvertFrom-Json
  $rdsHost = ($outs | Where-Object OutputKey -eq 'RdsEndpointAddress').OutputValue
  $rdsPort = ($outs | Where-Object OutputKey -eq 'RdsEndpointPort').OutputValue
  $dbName = ($outs | Where-Object OutputKey -eq 'RdsDatabaseName').OutputValue
  $redisHost = ($outs | Where-Object OutputKey -eq 'RedisEndpointAddress').OutputValue
  $redisPort = ($outs | Where-Object OutputKey -eq 'RedisEndpointPort').OutputValue

  $databaseUrl = "postgresql://grubfleet:${dbPwd}@${rdsHost}:${rdsPort}/${dbName}?sslmode=require"
  $redisUrl = "redis://${redisHost}:${redisPort}"

  $samPath = Join-Path $Root "samconfig.$($t.Name).toml"
  if ($t.Name -eq 'production') { $confirm = 'true' } else { $confirm = 'false' }

  $paramLine = @(
    "ApiFunctionName=\`"$($t.Fn)\`"",
    "AppEnv=\`"$($t.AppEnv)\`"",
    "ClientOrigin=\`"$($t.ClientOrigin)\`"",
    "DatabaseUrl=\`"$databaseUrl\`"",
    "RedisUrl=\`"$redisUrl\`"",
    "JwtAccessSecret=\`"$jwtAccess\`"",
    "JwtRefreshSecret=\`"$jwtRefresh\`"",
    "JwtAccessTtl=\`"15m\`"",
    "JwtRefreshTtl=\`"7d\`"",
    "LogLevel=\`"info\`"",
    "EnableWarmupSchedule=\`"$($t.Warmup)\`"",
    "ReservedConcurrency=$($t.Concurrency)",
    "VpcSubnetIds=\`"$vpcSubnets\`"",
    "VpcSecurityGroupIds=\`"$lambdaSg\`""
  ) -join ' '

  @"
version = 0.1

[default.deploy.parameters]
stack_name = "$($t.ApiStack)"
resolve_s3 = true
s3_prefix = "$($t.ApiStack)"
region = "$Region"
confirm_changeset = $confirm
capabilities = "CAPABILITY_IAM"
disable_rollback = false
profile = "$Profile"
image_repositories = []
parameter_overrides = "$paramLine"

[default.global.parameters]
region = "$Region"
profile = "$Profile"
"@ | Set-Content -Path $samPath -Encoding utf8NoBOM

  $meta.tiers[$t.Name] = @{
    dataStack = $t.Stack
    apiStack = $t.ApiStack
    rdsHost = $rdsHost
    redisHost = $redisHost
    dbName = $dbName
  }
}

$meta | ConvertTo-Json -Depth 5 | Set-Content -Path $MetaFile -Encoding utf8NoBOM
Write-Host "Wrote samconfig files and $MetaFile (hostnames only in meta)."
