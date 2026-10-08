/**
 * Local dev: purge integration-test RBAC/org junk and reseed demo roles + organisation sample.
 *
 * Requires: Docker Postgres up, APP_ENV=development (or pass --confirm-dev via ts scripts).
 *
 *   node scripts/dev-clean-test-roles.mjs
 *   node scripts/dev-clean-test-roles.mjs --seed-only
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const backend = join(root, 'apps', 'backend');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const extraArgs = process.argv.slice(2);

function runBackendSeedScript(relativePath) {
  const scriptPath = join(backend, relativePath);
  const passthrough = extraArgs
    .filter((a) => a !== '--seed-only' && a !== '--skip-organisation')
    .join(' ');
  const cmd = `${npm} exec -- ts-node -r tsconfig-paths/register "${scriptPath}" --confirm-dev ${passthrough}`.trim();
  const result = spawnSync(cmd, [], {
    cwd: backend,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      APP_ENV: process.env.APP_ENV ?? 'development',
    },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const seedOnly = extraArgs.includes('--seed-only');

if (!seedOnly) {
  runBackendSeedScript('src/database/seed/clean-dev-test-data.ts');
} else {
  runBackendSeedScript('src/database/seed/seed-dev-org-roles.ts');
}
