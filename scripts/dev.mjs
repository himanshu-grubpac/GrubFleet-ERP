/**
 * Local dev: Docker (Postgres + Redis) → migrate → backend + frontend.
 * Frontend uses local API (localhost:4000) regardless of staging in .env.local.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const isWin = process.platform === 'win32';

const BACKEND_ENV = join(root, 'apps', 'backend', '.env.development');
const BACKEND_ENV_TEMPLATE = `# Auto-created by npm run dev — adjust if needed
APP_ENV=development
NODE_ENV=development
PORT=4000
API_PREFIX=api/v1
DATABASE_URL=postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=dev-only-access-secret-min-32-characters!!
JWT_REFRESH_SECRET=dev-only-refresh-secret-min-32-characters!
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000
`;

const LOCAL_DATABASE_URL =
  'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp';
const LOCAL_REDIS_URL = 'redis://localhost:6379';

/** Backend + migrate: local Docker only (ignores RDS in .env.development). */
function backendDevEnv() {
  return {
    ...process.env,
    APP_ENV: 'development',
    NODE_ENV: 'development',
    PORT: '4000',
    API_PREFIX: 'api/v1',
    DATABASE_URL: LOCAL_DATABASE_URL,
    REDIS_URL: LOCAL_REDIS_URL,
    JWT_ACCESS_SECRET:
      process.env.JWT_ACCESS_SECRET ??
      'dev-only-access-secret-min-32-characters!!',
    JWT_REFRESH_SECRET:
      process.env.JWT_REFRESH_SECRET ??
      'dev-only-refresh-secret-min-32-characters!',
    JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL ?? '15m',
    JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL ?? '7d',
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
    CORS_ORIGIN: 'http://localhost:3000',
  };
}

/** Next.js must stay on 3000; API calls go to Nest on 4000 (do not pass backend PORT). */
function frontendDevEnv() {
  return {
    ...process.env,
    PORT: '3000',
    NEXT_PUBLIC_API_BASE_URL: 'http://localhost:4000/api/v1',
  };
}

async function waitForBackend(maxAttempts = 45) {
  const url = 'http://127.0.0.1:4000/api/v1/health';
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* Nest still booting */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Backend did not become ready on http://localhost:4000/api/v1/health');
}

const DEV_PORTS = [3000, 4000];

function killListenersOnPort(port) {
  if (isWin) {
    const { stdout } = spawnSync('netstat', ['-ano'], { encoding: 'utf8', shell: true });
    const pids = new Set();
    for (const line of stdout.split('\n')) {
      if (!line.includes('LISTENING')) continue;
      if (!new RegExp(`:${port}\\s`).test(line)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
    }
    for (const pid of pids) {
      spawnSync('taskkill', ['/PID', pid, '/F'], { stdio: 'ignore', shell: true });
    }
    return pids.size;
  }
  spawnSync('sh', ['-c', `lsof -ti:${port} | xargs kill -9 2>/dev/null || true`], {
    stdio: 'ignore',
  });
  return 0;
}

function killStaleDevProcesses() {
  console.log('Stopping prior dev servers on ports 3000 (Next) and 4000 (Nest)...');
  for (const port of DEV_PORTS) {
    const n = killListenersOnPort(port);
    if (n > 0) console.log(`  Port ${port}: stopped ${n} process(es).`);
  }
}

const children = [];

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      shell: isWin,
      ...options,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`));
    });
  });
}

function runBackground(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWin,
    ...options,
  });
  child.on('error', (err) => {
    console.error(err);
    shutdown(1);
  });
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    try {
      child.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

function ensureBackendEnv() {
  if (existsSync(BACKEND_ENV)) return;
  mkdirSync(dirname(BACKEND_ENV), { recursive: true });
  writeFileSync(BACKEND_ENV, BACKEND_ENV_TEMPLATE, 'utf8');
  console.log('Created apps/backend/.env.development (local Docker DB).');
}

async function main() {
  killStaleDevProcesses();
  await new Promise((r) => setTimeout(r, 500));

  ensureBackendEnv();

  console.log('Starting PostgreSQL + Redis (docker compose)...');
  await run('docker', ['compose', 'up', '-d', '--wait']);

  const backendEnv = backendDevEnv();
  if (existsSync(BACKEND_ENV)) {
    const raw = readFileSync(BACKEND_ENV, 'utf8');
    if (/rds\.amazonaws\.com/i.test(raw)) {
      console.warn(
        'Note: apps/backend/.env.development contains RDS URLs; npm run dev uses local Docker only.',
      );
    }
  }

  console.log('Applying migrations (idempotent)...');
  await run(npm, ['run', 'db:migrate', '-w', 'backend'], { env: backendEnv });

  console.log('Starting backend on http://localhost:4000/api/v1 ...');
  runBackground(npm, ['run', 'start:dev', '-w', 'backend'], { env: backendEnv });
  await waitForBackend();

  console.log('Starting frontend on http://localhost:3000 ...');
  runBackground(npm, ['run', 'dev', '-w', 'frontend'], { env: frontendDevEnv() });
}

main().catch((err) => {
  console.error(err.message || err);
  shutdown(1);
});
