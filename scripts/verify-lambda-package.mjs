/**
 * Assert lambda-package/ is ready for SAM deploy (dist entry + materialized workspace deps).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  getBackendWorkspaceDeps,
  workspacePackageToNodeModulesPath,
} from './lambda-bundle-workspace.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string} [outDir] defaults to lambda-package/
 * @param {{ requireSmoke?: boolean }} [options]
 */
export function verifyLambdaPackage(outDir = join(root, 'lambda-package'), options = {}) {
  const { requireSmoke = true } = options;
  const errors = [];

  const lambdaEntry = join(outDir, 'dist', 'src', 'lambda.js');
  if (!existsSync(lambdaEntry)) {
    errors.push(`Missing Lambda handler build output: ${lambdaEntry}`);
  }

  const backendPkgPath = join(root, 'apps', 'backend', 'package.json');
  const backendPkg = JSON.parse(readFileSync(backendPkgPath, 'utf8'));
  const workspaceDeps = getBackendWorkspaceDeps(backendPkg.dependencies ?? {});

  for (const name of Object.keys(workspaceDeps)) {
    const mainPath = join(
      outDir,
      workspacePackageToNodeModulesPath(name),
      'dist',
      'index.js',
    );
    if (!existsSync(mainPath)) {
      errors.push(`Missing workspace package in bundle: ${mainPath}`);
    }
  }

  if (errors.length > 0) {
    for (const msg of errors) console.error(msg);
    return { ok: false, errors };
  }

  if (requireSmoke) {
    const smoke = spawnSync(
      process.execPath,
      [
        '-e',
        "require('@grubpac/validation'); require('fs').accessSync('./dist/src/lambda.js');",
      ],
      { cwd: outDir, stdio: 'pipe', encoding: 'utf8' },
    );
    if (smoke.status !== 0) {
      const detail = (smoke.stderr || smoke.stdout || '').trim();
      errors.push(
        detail
          ? `Lambda package require smoke test failed: ${detail}`
          : 'Lambda package require smoke test failed',
      );
      for (const msg of errors) console.error(msg);
      return { ok: false, errors };
    }
  }

  console.log('Lambda package verification passed.');
  return { ok: true, errors: [] };
}

const scriptPath = fileURLToPath(import.meta.url);
const isDirectRun =
  process.argv[1] && join(process.argv[1]).replace(/\\/g, '/') === scriptPath.replace(/\\/g, '/');

if (isDirectRun) {
  const result = verifyLambdaPackage();
  process.exit(result.ok ? 0 : 1);
}
