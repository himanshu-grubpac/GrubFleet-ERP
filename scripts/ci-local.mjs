/**
 * Local gate mirroring .github/workflows/ci.yml (develop push).
 * Run before `git push origin develop` — or rely on Husky pre-push hook.
 *
 * Requires: Docker Postgres + Redis (same as npm run dev), or set DATABASE_URL / REDIS_URL.
 * Skip hook: SKIP_PREPUSH=1 git push …  or  HUSKY=0 git push …
 */
import { spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const ciEnv = {
  ...process.env,
  NODE_ENV: 'test',
  API_PREFIX: process.env.API_PREFIX ?? 'api/v1',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'error',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://grubpac:grubpac_dev@127.0.0.1:5432/grubpac_erp',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ??
    'ci-access-secret-min-32-characters-long!!',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ??
    'ci-refresh-secret-min-32-characters-long!',
  NEXT_PUBLIC_API_BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1',
};

function waitForPort(host, port, label, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryOnce = () => {
      const socket = createConnection({ host, port }, () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - start >= timeoutMs) {
          reject(
            new Error(
              `${label} not reachable at ${host}:${port} — start Docker (npm run dev) or set DATABASE_URL/REDIS_URL.`,
            ),
          );
          return;
        }
        setTimeout(tryOnce, 1000);
      });
    };
    tryOnce();
  });
}

function runStep(title, args) {
  console.log(`\n▶ ${title}`);
  const spawnOpts = { cwd: root, env: ciEnv, stdio: 'inherit' };
  // Windows: npm.cmd + args array needs shell; Node DEP0190 if shell:true with separate args.
  const result =
    process.platform === 'win32'
      ? spawnSync([npm, ...args].join(' '), { ...spawnOpts, shell: true })
      : spawnSync(npm, args, { ...spawnOpts, shell: false });
  if (result.status !== 0) {
    console.error(`\n✗ Failed: ${title}`);
    process.exit(result.status ?? 1);
  }
}

async function main() {
  console.log('Local CI gate (matches GitHub Actions ci.yml)\n');

  await waitForPort('127.0.0.1', 5432, 'Postgres');
  await waitForPort('127.0.0.1', 6379, 'Redis');

  runStep('Migrate database', ['run', 'db:migrate', '-w', 'backend']);
  runStep('Lint backend', ['run', 'lint', '-w', 'backend']);
  runStep('Typecheck backend', ['run', 'typecheck', '-w', 'backend']);
  runStep('Test backend', ['run', 'test', '-w', 'backend']);
  runStep('Build backend', ['run', 'build', '-w', 'backend']);
  runStep('Lint frontend', ['run', 'lint', '-w', 'frontend']);
  runStep('Typecheck frontend', ['run', 'typecheck', '-w', 'frontend']);
  runStep('Build frontend', ['run', 'build', '-w', 'frontend']);

  console.log('\n✓ Local CI gate passed — safe to push to develop (CI should match).');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
