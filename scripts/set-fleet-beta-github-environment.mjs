/**
 * One-time: create GitHub Environment fleet-beta and set secrets/vars from samconfig.fleetbeta.toml.
 * Does not print secret values.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = 'himanshu-grubpac/GrubFleet-ERP';
const sam = readFileSync(join(root, 'samconfig.fleetbeta.toml'), 'utf8');

function extract(key) {
  const re = new RegExp(`${key}=\\\\"([^\\\\"]+)\\\\"`);
  const m = sam.match(re);
  if (!m) throw new Error(`Missing ${key} in samconfig.fleetbeta.toml`);
  return m[1];
}

const databaseUrl = extract('DatabaseUrl');
const redisUrl = extract('RedisUrl');
const jwtAccess = extract('JwtAccessSecret');
const jwtRefresh = extract('JwtRefreshSecret');

const apiBase = 'https://yyie4pz8da.execute-api.ap-south-1.amazonaws.com/api/v1';
const roleArn = 'arn:aws:iam::662252246711:role/GrubFleetGitHubActionsDeploy';

execSync(
  `gh api --method PUT repos/${repo}/environments/fleet-beta`,
  { stdio: 'inherit' },
);

function setSecret(name, value) {
  execSync(`gh secret set ${name} --env fleet-beta --body ${JSON.stringify(value)}`, {
    stdio: 'inherit',
  });
}

function setVar(name, value) {
  execSync(`gh variable set ${name} --env fleet-beta --body ${JSON.stringify(value)}`, {
    stdio: 'inherit',
  });
}

setSecret('DATABASE_URL', databaseUrl);
setSecret('REDIS_URL', redisUrl);
setSecret('JWT_ACCESS_SECRET', jwtAccess);
setSecret('JWT_REFRESH_SECRET', jwtRefresh);
setSecret('AWS_ROLE_ARN', roleArn);
setSecret('DEPLOY_HEALTH_URL', `${apiBase}/health`);

setVar('AWS_REGION', 'ap-south-1');
setVar('ACTIVE_SLOT', 'blue');
setVar('NEXT_PUBLIC_API_BASE_URL', apiBase);
setVar('PORTAL_S3_BUCKET', 'grubfleet-portal-fleetbeta-662252246711');
setVar('CLOUDFRONT_DISTRIBUTION_ID', 'E1FNVMAROJF9L1');
setVar('SAM_CLIENT_ORIGIN', 'https://d206aq3nodl3r1.cloudfront.net');
setVar('RDS_MIGRATION_SECURITY_GROUP_ID', 'sg-0198b9781297f8bf7');
setVar('VPC_SUBNET_IDS', 'subnet-0d88d823842ae5a46,subnet-051d6188f4e829db7');
setVar('VPC_SECURITY_GROUP_IDS', 'sg-0732094de05e8f03b');

console.log('GitHub Environment fleet-beta configured.');
