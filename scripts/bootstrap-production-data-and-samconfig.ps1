# One-time production bootstrap: public RDS (migrate from laptop), tier sizing from template (db.t3.medium, 100 GiB + autoscale), samconfig.production.toml
param(
  [string]$Profile = 'grubfleet-erp',
  [string]$Region = 'ap-south-1',
  [string]$MigrationCidr = '106.192.124.79/32'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$DataTemplate = Join-Path $Root 'infrastructure/grubfleet-data-tier.yaml'

function New-Secret([int]$Length = 48) {
  $bytes = New-Object byte[] $Length
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  [Convert]::ToBase64String($bytes) -replace '[+/=]', 'x'
}
function New-DbPassword() {
  -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 28 | ForEach-Object { [char]$_ })
}

$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
$stackStatus = aws cloudformation describe-stacks --profile $Profile --region $Region `
  --stack-name grubfleet-data-production --query 'Stacks[0].StackStatus' --output text 2>$null
$stackOk = $LASTEXITCODE -eq 0 -and $stackStatus -and $stackStatus -ne 'None'
$ErrorActionPreference = $prevEap
if ($stackOk) {
  Write-Host "Existing grubfleet-data-production ($stackStatus) - removing for bootstrap..."
  $ErrorActionPreference = 'SilentlyContinue'
  $rds = aws rds describe-db-instances --profile $Profile --region $Region `
    --db-instance-identifier grubfleet-production-postgres --query 'DBInstances[0].DBInstanceIdentifier' --output text 2>$null
  $rdsOk = $LASTEXITCODE -eq 0 -and $rds
  $ErrorActionPreference = $prevEap
  if ($rdsOk) {
    aws rds modify-db-instance --profile $Profile --region $Region `
      --db-instance-identifier grubfleet-production-postgres --no-deletion-protection --apply-immediately | Out-Null
    aws rds wait db-instance-available --profile $Profile --region $Region --db-instance-identifier grubfleet-production-postgres
  }
  aws cloudformation delete-stack --profile $Profile --region $Region --stack-name grubfleet-data-production
  aws cloudformation wait stack-delete-complete --profile $Profile --region $Region --stack-name grubfleet-data-production
}

$dbPwd = New-DbPassword
aws cloudformation deploy --profile $Profile --region $Region `
  --stack-name grubfleet-data-production `
  --template-file $DataTemplate `
  --parameter-overrides `
    "Tier=production" `
    "DbMasterPassword=$dbPwd" `
    "RdsPubliclyAccessible=true" `
    "MigrationClientCidr=$MigrationCidr" `
  --no-fail-on-empty-changeset

$network = aws cloudformation describe-stacks --profile $Profile --region $Region --stack-name grubfleet-network `
  --query 'Stacks[0].Outputs' --output json | ConvertFrom-Json
$privA = ($network | Where-Object OutputKey -eq 'PrivateSubnetAId').OutputValue
$privB = ($network | Where-Object OutputKey -eq 'PrivateSubnetBId').OutputValue
$lambdaSg = ($network | Where-Object OutputKey -eq 'LambdaSecurityGroupId').OutputValue
$vpcSubnets = "$privA,$privB"

$outs = aws cloudformation describe-stacks --profile $Profile --region $Region --stack-name grubfleet-data-production `
  --query 'Stacks[0].Outputs' --output json | ConvertFrom-Json
$rdsHost = ($outs | Where-Object OutputKey -eq 'RdsEndpointAddress').OutputValue
$rdsPort = ($outs | Where-Object OutputKey -eq 'RdsEndpointPort').OutputValue
$dbName = ($outs | Where-Object OutputKey -eq 'RdsDatabaseName').OutputValue
$redisHost = ($outs | Where-Object OutputKey -eq 'RedisEndpointAddress').OutputValue
$redisPort = ($outs | Where-Object OutputKey -eq 'RedisEndpointPort').OutputValue

$databaseUrl = "postgresql://grubfleet:${dbPwd}@${rdsHost}:${rdsPort}/${dbName}?sslmode=require"
$redisUrl = "redis://${redisHost}:${redisPort}"
$jwtAccess = New-Secret 48
$jwtRefresh = New-Secret 48

$paramLine = @(
  'ApiFunctionName=\"grubfleet-api-production\"',
  'AppEnv=\"production\"',
  'ClientOrigin=\"http://localhost:3000\"',
  "DatabaseUrl=`"$databaseUrl`"" -replace '"', '\"',
  "RedisUrl=`"$redisUrl`"" -replace '"', '\"',
  "JwtAccessSecret=`"$jwtAccess`"" -replace '"', '\"',
  "JwtRefreshSecret=`"$jwtRefresh`"" -replace '"', '\"',
  'JwtAccessTtl=\"15m\"',
  'JwtRefreshTtl=\"7d\"',
  'LogLevel=\"info\"',
  'EnableWarmupSchedule=\"true\"',
  'ReservedConcurrency=0',
  "VpcSubnetIds=`"$vpcSubnets`"" -replace '"', '\"',
  "VpcSecurityGroupIds=`"$lambdaSg`"" -replace '"', '\"'
) -join ' '

$tomlBody = @"
version = 0.1

[default.deploy.parameters]
stack_name = "grubfleet-api-production"
resolve_s3 = true
s3_prefix = "grubfleet-api-production"
region = "ap-south-1"
confirm_changeset = true
capabilities = "CAPABILITY_IAM"
disable_rollback = false
profile = "grubfleet-erp"
image_repositories = []
parameter_overrides = "$paramLine"

[default.global.parameters]
region = "ap-south-1"
profile = "grubfleet-erp"
"@
$samPath = Join-Path $Root 'samconfig.production.toml'
[System.IO.File]::WriteAllText($samPath, $tomlBody, [System.Text.UTF8Encoding]::new($false))

Write-Host 'Production data + samconfig.production.toml ready. Next: npm run deploy:production:api'
