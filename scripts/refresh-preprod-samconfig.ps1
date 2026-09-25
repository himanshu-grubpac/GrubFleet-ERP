$ErrorActionPreference = 'Stop'
$Profile = 'grubfleet-erp'
$Region = 'ap-south-1'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function New-Secret([int]$Length = 48) {
  $bytes = New-Object byte[] $Length
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  [Convert]::ToBase64String($bytes) -replace '[+/=]', 'x'
}
function New-DbPassword() {
  -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 28 | ForEach-Object { [char]$_ })
}

$dbPwd = New-DbPassword
aws rds modify-db-instance `
  --profile $Profile `
  --region $Region `
  --db-instance-identifier grubfleet-preprod-postgres `
  --master-user-password $dbPwd `
  --apply-immediately | Out-Null
aws rds wait db-instance-available --profile $Profile --region $Region --db-instance-identifier grubfleet-preprod-postgres

$network = aws cloudformation describe-stacks --profile $Profile --region $Region --stack-name grubfleet-network `
  --query 'Stacks[0].Outputs' --output json | ConvertFrom-Json
$privA = ($network | Where-Object OutputKey -eq 'PrivateSubnetAId').OutputValue
$privB = ($network | Where-Object OutputKey -eq 'PrivateSubnetBId').OutputValue
$lambdaSg = ($network | Where-Object OutputKey -eq 'LambdaSecurityGroupId').OutputValue
$vpcSubnets = "$privA,$privB"

$outs = aws cloudformation describe-stacks --profile $Profile --region $Region --stack-name grubfleet-data-preprod `
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
  'ApiFunctionName="grubfleet-api-preprod"',
  'AppEnv="preprod"',
  'ClientOrigin="http://localhost:3000"',
  "DatabaseUrl=`"$databaseUrl`"",
  "RedisUrl=`"$redisUrl`"",
  "JwtAccessSecret=`"$jwtAccess`"",
  "JwtRefreshSecret=`"$jwtRefresh`"",
  'JwtAccessTtl="15m"',
  'JwtRefreshTtl="7d"',
  'LogLevel="info"',
  'EnableWarmupSchedule="true"',
  'ReservedConcurrency=10',
  "VpcSubnetIds=`"$vpcSubnets`"",
  "VpcSecurityGroupIds=`"$lambdaSg`""
) -join ' '

@"
version = 0.1

[default.deploy.parameters]
stack_name = "grubfleet-api-preprod"
resolve_s3 = true
s3_prefix = "grubfleet-api-preprod"
region = "ap-south-1"
confirm_changeset = false
capabilities = "CAPABILITY_IAM"
disable_rollback = false
profile = "grubfleet-erp"
image_repositories = []
parameter_overrides = "$paramLine"

[default.global.parameters]
region = "ap-south-1"
profile = "grubfleet-erp"
"@ | Set-Content -Path (Join-Path $Root 'samconfig.preprod.toml') -Encoding utf8

Write-Host "Refreshed samconfig.preprod.toml and RDS master password."
