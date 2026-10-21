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
    routes.push({ file, method: m[1].toUpperCase(), path: '/' + full });
  }
}

const openapi = fs.readFileSync(path.join('docs', 'api', 'openapi.yaml'), 'utf8');
const openapiPaths = (openapi.match(/^  \/[a-zA-Z0-9_{}\/-]+:/gm) || []).length;

console.log(JSON.stringify({ controllerFiles: walk(root).length, routeDecorators: routes.length, openapiPathKeys: openapiPaths }, null, 2));
