/**
 * Discover monorepo workspace packages referenced by backend dependencies.
 * Used by prepare-lambda.mjs to materialize file: workspace deps for SAM uploads.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** @returns {Map<string, string>} package name → relative path from repo root (e.g. packages/validation) */
export function listWorkspacePackagesByName() {
  const packagesDir = join(root, 'packages');
  const map = new Map();
  if (!existsSync(packagesDir)) return map;

  for (const ent of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const pkgJsonPath = join(packagesDir, ent.name, 'package.json');
    if (!existsSync(pkgJsonPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    if (typeof pkg.name === 'string' && pkg.name.length > 0) {
      map.set(pkg.name, join('packages', ent.name));
    }
  }
  return map;
}

/**
 * @param {Record<string, string>} backendDependencies
 * @returns {Record<string, string>} workspace package name → relative path
 */
export function getBackendWorkspaceDeps(backendDependencies = {}) {
  const workspaceByName = listWorkspacePackagesByName();
  /** @type {Record<string, string>} */
  const result = {};
  for (const name of Object.keys(backendDependencies)) {
    const rel = workspaceByName.get(name);
    if (rel) result[name] = rel;
  }
  return result;
}

/** @param {string} packageName e.g. @grubpac/validation */
export function workspacePackageToNodeModulesPath(packageName) {
  if (packageName.startsWith('@')) {
    const slash = packageName.indexOf('/');
    if (slash === -1) return join('node_modules', packageName);
    const scope = packageName.slice(0, slash);
    const pkg = packageName.slice(slash + 1);
    return join('node_modules', scope, pkg);
  }
  return join('node_modules', packageName);
}

export function repoRoot() {
  return root;
}
