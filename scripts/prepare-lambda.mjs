/**
 * Builds the NestJS backend and assembles lambda-package/ for SAM deploy.
 * Copies nest build output (dist/) + production node_modules (Handler: dist/src/lambda.handler).
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
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

/** SAM zips CodeUri by walking files; nested .bin symlinks often ENOENT on GHA. */
function removeNestedBinDirs(dir) {
  if (!existsSync(dir)) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const child = join(dir, ent.name);
    if (ent.name === '.bin') {
      rmSync(child, { recursive: true, force: true });
    } else {
      removeNestedBinDirs(child);
    }
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

run(
  npm,
  ['run', 'build', '-w', '@grubpac/validation'],
  root,
  'Building @grubpac/validation...',
);
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

const validationSrc = join(root, 'packages', 'validation');
const validationStaging = join(stagingDir, 'packages', 'validation');
mkdirSync(join(stagingDir, 'packages'), { recursive: true });
cpSync(validationSrc, validationStaging, {
  recursive: true,
  filter: (src) => !src.split(/[/\\]/).includes('node_modules'),
});

const backendPkg = JSON.parse(
  readFileSync(join(backendDir, 'package.json'), 'utf8'),
);
const stagingPkg = {
  name: 'grubfleet-lambda-backend-bundle',
  private: true,
  dependencies: {
    ...backendPkg.dependencies,
    '@grubpac/validation': 'file:./packages/validation',
  },
};
writeFileSync(
  join(stagingDir, 'package.json'),
  `${JSON.stringify(stagingPkg, null, 2)}\n`,
);

const stagingEnv = { ...process.env, HUSKY: '0', CI: 'true' };
const installArgs = ['install', '--omit=dev', '--no-package-lock'];
console.log('Installing production dependencies for Lambda bundle...');
const installResult = spawnSync(npm, installArgs, {
  cwd: stagingDir,
  env: stagingEnv,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (installResult.status !== 0) {
  console.error('Installing production dependencies for Lambda bundle... failed');
  process.exit(installResult.status ?? 1);
}

cpSync(join(backendDir, 'dist'), join(outDir, 'dist'), { recursive: true });
cpSync(join(stagingDir, 'node_modules'), join(outDir, 'node_modules'), {
  recursive: true,
  dereference: true,
});
tryRemoveDir(stagingDir);

removeNestedBinDirs(join(outDir, 'node_modules'));

console.log('Lambda package ready at lambda-package/');
