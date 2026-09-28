/**
 * SAM deploy with absolute config path (repo root may contain spaces on Windows).
 * Usage: node scripts/sam-deploy.mjs staging|preprod|production
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const tier = process.argv[2];
const allowed = ['staging', 'preprod', 'production'];
if (!allowed.includes(tier)) {
  console.error(`Usage: node scripts/sam-deploy.mjs <${allowed.join('|')}>`);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const template = join(root, '.aws-sam', 'build', 'template.yaml');
const config = join(root, `samconfig.${tier}.toml`);

if (!existsSync(template)) {
  console.error('Missing .aws-sam/build/template.yaml — run prepare:lambda and stage-sam-artifacts first.');
  process.exit(1);
}
if (!existsSync(config)) {
  console.error(`Missing ${config}`);
  process.exit(1);
}

const cmd = `sam deploy --force-upload --no-confirm-changeset --template-file "${template}" --config-file "${config}"`;
try {
  execSync(cmd, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
    maxBuffer: 50 * 1024 * 1024,
  });
} catch (err) {
  const stdout = err.stdout?.toString() ?? '';
  const stderr = err.stderr?.toString() ?? '';
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  const combined = [err.message, stdout, stderr].join('\n');
  if (combined.includes('No changes to deploy')) {
    console.log('SAM stack already up to date (no CloudFormation changes).');
    process.exit(0);
  }
  throw err;
}
