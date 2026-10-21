/**
 * Compares Nest controller route decorators to docs/api/openapi.yaml path keys.
 * Run from repo root: node scripts/audit-openapi-route-gap.mjs
 * CI gate candidate (AUD-004): fail when gap exceeds threshold or on auth/* drift.
 */
import fs from 'fs';
import path from 'path';

const root = path.join('apps', 'backend', 'src');

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name.endsWith('.controller.ts')) acc.push(p);
  }
  return acc;
}

function toOpenApiPath(nestPath) {
  return nestPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

const routes = [];
for (const file of walk(root)) {
  const t = fs.readFileSync(file, 'utf8');
  const ctrl = t.match(/@Controller\(\s*['"]([^'"]*)['"]\s*\)/);
  const base = ctrl ? ctrl[1].replace(/^\//, '') : '';
  const re = /@(Get|Post|Put|Patch|Delete)\(\s*(?:['"]([^'"]*)['"])?\s*\)/g;
  let m;
  while ((m = re.exec(t))) {
    const sub = (m[2] ?? '').replace(/^\//, '');
    const full = ['', base, sub].filter(Boolean).join('/');
    const path = toOpenApiPath('/' + full);
    routes.push({ file, method: m[1].toUpperCase(), path });
  }
}

const openapi = fs.readFileSync(path.join('docs', 'api', 'openapi.yaml'), 'utf8');
const pathKeyRe = /^  (\/[a-zA-Z0-9_{}\/-]+):/gm;
const openapiPaths = new Set();
let pm;
while ((pm = pathKeyRe.exec(openapi))) {
  openapiPaths.add(pm[1]);
}

const missingInOpenApi = routes.filter((r) => !openapiPaths.has(r.path));
const byPrefix = {};
for (const r of missingInOpenApi) {
  const prefix = r.path.split('/').filter(Boolean)[0] ?? '(root)';
  byPrefix[prefix] = (byPrefix[prefix] ?? 0) + 1;
}

const report = {
  controllerRouteDecorators: routes.length,
  openapiPathKeys: openapiPaths.size,
  missingInOpenApi: missingInOpenApi.length,
  missingByFirstSegment: byPrefix,
  sampleMissing: missingInOpenApi
    .slice(0, 15)
    .map((r) => `${r.method} ${r.path}`),
};

console.log(JSON.stringify(report, null, 2));

if (missingInOpenApi.length > 0) {
  console.error(
    `\nOpenAPI gap: ${missingInOpenApi.length} controller route(s) missing from docs/api/openapi.yaml`,
  );
  process.exit(1);
}
