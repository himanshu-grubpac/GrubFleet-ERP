/**
 * Stage .aws-sam/build for `sam deploy --no-build` (avoids SAM Node builder rewriting Handler on Windows).
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lambdaPackage = join(root, 'lambda-package');
const lambdaEntry = join(lambdaPackage, 'dist', 'src', 'lambda.js');

if (!existsSync(lambdaEntry)) {
  console.error('Run npm run prepare:lambda first (missing lambda-package/dist/src/lambda.js).');
  process.exit(1);
}

const buildRoot = join(root, '.aws-sam', 'build');
const codeUriDir = join(buildRoot, 'lambda-package');

try {
  rmSync(buildRoot, { recursive: true, force: true });
} catch {
  /* ignore */
}

mkdirSync(codeUriDir, { recursive: true });
cpSync(lambdaPackage, codeUriDir, { recursive: true });
cpSync(join(root, 'template.yaml'), join(buildRoot, 'template.yaml'));

console.log('Staged SAM artifacts at .aws-sam/build (Handler: dist/src/lambda.handler).');
