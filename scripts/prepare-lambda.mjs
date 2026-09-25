/**
 * Builds the NestJS backend and assembles lambda-package/ for SAM deploy.
 * Production node_modules only; manifests removed so SAM does not re-run npm install.
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
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`${label} failed`);
    process.exit(result.status ?? 1);
  }
}

run(npm, ['run', 'build', '-w', 'backend'], root, 'Building backend (nest build)...');

const distSrc = join(backendDir, 'dist');
const lambdaEntry = join(distSrc, 'src', 'lambda.js');
if (!existsSync(lambdaEntry)) {
  console.error(
    'Expected apps/backend/dist/src/lambda.js after build — check nest build output.',
  );
  process.exit(1);
}

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

cpSync(distSrc, join(outDir, 'dist'), { recursive: true });
cpSync(join(backendDir, 'package.json'), join(outDir, 'package.json'));

const lockFile = join(backendDir, 'package-lock.json');
const installArgs =
  existsSync(lockFile)
    ? ['ci', '--omit=dev']
    : ['install', '--omit=dev', '--no-package-lock'];
if (existsSync(lockFile)) {
  cpSync(lockFile, join(outDir, 'package-lock.json'));
}

run(
  npm,
  installArgs,
  outDir,
  'Installing production dependencies in lambda-package...',
);

for (const file of ['package.json', 'package-lock.json']) {
  const path = join(outDir, file);
  if (existsSync(path)) {
    rmSync(path);
  }
}

console.log('Lambda package ready at lambda-package/');
console.log('Next: npm run sam:build && sam deploy --config-file samconfig.<tier>.toml');
