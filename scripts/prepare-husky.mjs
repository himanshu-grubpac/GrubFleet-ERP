/**
 * Root "prepare" lifecycle — install git hooks only in local dev when husky is present.
 * CI, Docker, HUSKY=0, and npm ci --omit=dev must never fail on a missing husky binary.
 */
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function shouldSkip() {
  if (process.env.HUSKY === '0') return true;
  if (process.env.CI === 'true' || process.env.CI === '1') return true;
  if (process.env.NODE_ENV === 'production') return true;
  return false;
}

if (shouldSkip()) {
  process.exit(0);
}

const huskyBin = join(root, 'node_modules', 'husky', 'bin.js');
if (!existsSync(huskyBin)) {
  process.exit(0);
}

const result = spawnSync(process.execPath, [huskyBin], {
  cwd: root,
  stdio: 'inherit',
});
process.exit(result.status ?? (result.error ? 1 : 0));
