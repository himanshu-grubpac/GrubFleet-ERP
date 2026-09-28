/**
 * Writes gitignored samconfig.<tier>.toml from process env (GitHub Actions / CI).
 * Usage: node scripts/write-samconfig-from-env.mjs staging|preprod|production
 *
 * Required env: DATABASE_URL, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
 * Optional: SAM_CLIENT_ORIGIN (comma list, unquoted in overrides), AWS_REGION,
 *   VPC_SUBNET_IDS, VPC_SECURITY_GROUP_IDS (comma-separated)
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const tier = process.argv[2];
const allowed = ['staging', 'preprod', 'production'];
if (!allowed.includes(tier)) {
  console.error(`Usage: node scripts/write-samconfig-from-env.mjs <${allowed.join('|')}>`);
  process.exit(1);
}

function requireEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return v;
}

function escapeSamQuoted(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Escape for the outer TOML double-quoted parameter_overrides value. */
function escapeTomlDoubleQuoted(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const TIER = {
  staging: {
    stackName: 'grubfleet-api-staging',
    apiFunctionName: 'grubfleet-api-staging',
    appEnv: 'staging',
    confirmChangeset: false,
    enableWarmupSchedule: 'false',
    reservedConcurrency: 0,
    appendLocalhost: true,
  },
  preprod: {
    stackName: 'grubfleet-api-preprod',
    apiFunctionName: 'grubfleet-api-preprod',
    appEnv: 'preprod',
    confirmChangeset: false,
    enableWarmupSchedule: 'true',
    reservedConcurrency: 10,
    appendLocalhost: true,
  },
  production: {
    stackName: 'grubfleet-api-production',
    apiFunctionName: 'grubfleet-api-production',
    appEnv: 'production',
    confirmChangeset: true,
    enableWarmupSchedule: 'true',
    reservedConcurrency: 40,
    appendLocalhost: false,
  },
};

const cfg = TIER[tier];
const region = process.env.AWS_REGION?.trim() || 'ap-south-1';

const databaseUrl = requireEnv('DATABASE_URL');
const redisUrl = requireEnv('REDIS_URL');
const jwtAccess = requireEnv('JWT_ACCESS_SECRET');
const jwtRefresh = requireEnv('JWT_REFRESH_SECRET');

let clientOrigin = process.env.SAM_CLIENT_ORIGIN?.trim() || process.env.CLIENT_ORIGIN?.trim() || '';
if (!clientOrigin) {
  console.error('Missing SAM_CLIENT_ORIGIN or CLIENT_ORIGIN (CloudFront portal URL(s), comma-separated)');
  process.exit(1);
}
if (cfg.appendLocalhost && !clientOrigin.includes('localhost:3000')) {
  clientOrigin = `${clientOrigin.replace(/,$/, '')},http://localhost:3000`;
}

const parts = [
  `ApiFunctionName="${cfg.apiFunctionName}"`,
  `AppEnv="${cfg.appEnv}"`,
  `ClientOrigin="${escapeSamQuoted(clientOrigin)}"`,
  `DatabaseUrl="${escapeSamQuoted(databaseUrl)}"`,
  `RedisUrl="${escapeSamQuoted(redisUrl)}"`,
  `JwtAccessSecret="${escapeSamQuoted(jwtAccess)}"`,
  `JwtRefreshSecret="${escapeSamQuoted(jwtRefresh)}"`,
  'JwtAccessTtl="15m"',
  'JwtRefreshTtl="7d"',
  'LogLevel="info"',
  `EnableWarmupSchedule="${cfg.enableWarmupSchedule}"`,
  `ReservedConcurrency=${cfg.reservedConcurrency}`,
];

const vpcSubnets = process.env.VPC_SUBNET_IDS?.trim();
const vpcSgs = process.env.VPC_SECURITY_GROUP_IDS?.trim();
if (vpcSubnets && vpcSgs) {
  parts.push(`VpcSubnetIds="${escapeSamQuoted(vpcSubnets)}"`);
  parts.push(`VpcSecurityGroupIds="${escapeSamQuoted(vpcSgs)}"`);
}

const parameterOverrides = parts.join(' ');
const confirmLine = cfg.confirmChangeset ? 'true' : 'false';

const toml = `version = 0.1

[default.deploy.parameters]
stack_name = "${cfg.stackName}"
resolve_s3 = true
s3_prefix = "${cfg.stackName}"
region = "${region}"
confirm_changeset = ${confirmLine}
capabilities = "CAPABILITY_IAM"
disable_rollback = false
image_repositories = []
parameter_overrides = "${escapeTomlDoubleQuoted(parameterOverrides)}"

[default.global.parameters]
region = "${region}"
`;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, `samconfig.${tier}.toml`);
writeFileSync(outPath, toml, 'utf8');
console.log(`Wrote ${outPath} (no profile — uses ambient AWS credentials)`);
