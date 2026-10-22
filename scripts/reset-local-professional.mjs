/**
 * Full local Docker reset: drop volumes → migrate → slim professional seed only.
 *
 *   npm run db:reset:local-professional
 *
 * Login after reset: admin@grubpac.local / Grubpac123 (grubpac-dev org).
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const isWin = process.platform === 'win32';

const LOCAL_DATABASE_URL =
  'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp';

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

const seedEnv = {
  ...process.env,
  APP_ENV: 'development',
  NODE_ENV: 'development',
  DATABASE_URL: LOCAL_DATABASE_URL,
};

async function main() {
  console.log('Stopping Docker and removing Postgres/Redis volumes...');
  await run('docker', ['compose', 'down', '-v']);
  console.log('Starting PostgreSQL + Redis...');
  await run('docker', ['compose', 'up', '-d', '--wait']);
  console.log('Applying migrations...');
  await run(npm, ['run', 'db:migrate', '-w', 'backend'], { env: seedEnv });
  console.log('Seeding slim local org + asset data...');
  await run(npm, ['run', 'db:seed', '-w', 'backend'], { env: seedEnv });
  console.log('Local professional reset complete.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
