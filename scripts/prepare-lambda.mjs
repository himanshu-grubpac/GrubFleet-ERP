/**
 * Builds the NestJS backend and assembles lambda-package/ for SAM deploy.
 * Copies nest build output (dist/) + production node_modules (Handler: dist/src/lambda.handler).
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = join(root, 'apps', 'backend');
const outDir = join(root, 'lambda-package');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(cmd, args, cwd, label) {
  console.log(label);
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`${label} failed`);
    process.exit(result.status ?? 1);
  }
}

function tryRemoveDir(dir) {
  if (!existsSync(dir)) return true;
  try {
    rmSync(dir, { recursive: true, force: true });
    return true;
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? err.code : '';
    if (code === 'EPERM' || code === 'EBUSY') {
      console.warn(`Could not remove ${dir} (${code}); refreshing in place.`);
      return false;
    }
    throw err;
  }
}

run(npm, ['run', 'build', '-w', 'backend'], root, 'Building backend (nest build)...');

const lambdaEntry = join(backendDir, 'dist', 'src', 'lambda.js');
if (!existsSync(lambdaEntry)) {
  console.error('Expected apps/backend/dist/src/lambda.js after build.');
  process.exit(1);
}

tryRemoveDir(outDir);
mkdirSync(outDir, { recursive: true });

const stagingDir = join(root, '.lambda-staging');
tryRemoveDir(stagingDir);
mkdirSync(stagingDir, { recursive: true });
cpSync(join(backendDir, 'package.json'), join(stagingDir, 'package.json'));
const lockFile = join(backendDir, 'package-lock.json');
if (existsSync(lockFile)) {
  cpSync(lockFile, join(stagingDir, 'package-lock.json'));
}

run(
  npm,
  existsSync(lockFile) ? ['ci', '--omit=dev'] : ['install', '--omit=dev', '--no-package-lock'],
  stagingDir,
  'Installing production dependencies for Lambda bundle...',
);

cpSync(join(backendDir, 'dist'), join(outDir, 'dist'), { recursive: true });
cpSync(join(stagingDir, 'node_modules'), join(outDir, 'node_modules'), { recursive: true });
tryRemoveDir(stagingDir);

console.log('Lambda package ready at lambda-package/');
