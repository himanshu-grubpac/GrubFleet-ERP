/**
 * Add sortBy + sortOrder query params to Postman list GET requests (when missing).
 */
import fs from 'node:fs';
import path from 'node:path';

const POSTMAN = path.join(
  process.cwd(),
  'docs/api/postman/GrubFleet-ERP.postman_collection.json',
);

const SORT_QUERY = [
  { key: 'sortBy', value: '', description: 'Optional list sort field (see OpenAPI enum)' },
  { key: 'sortOrder', value: '', description: 'asc or desc when sortBy is set' },
];

function walk(items, fn) {
  for (const item of items) {
    fn(item);
    if (item.item) walk(item.item, fn);
  }
}

const col = JSON.parse(fs.readFileSync(POSTMAN, 'utf8'));
let patched = 0;

walk(col.item, (item) => {
  const req = item.request;
  if (!req || req.method !== 'GET') return;
  const url = req.url;
  if (!url || typeof url !== 'object' || !Array.isArray(url.query)) return;
  const pathStr = Array.isArray(url.path) ? url.path.join('/') : '';
  const looksPaginated = url.query.some((q) => q.key === 'page' || q.key === 'pageSize');
  if (!looksPaginated) return;
  if (url.query.some((q) => q.key === 'sortBy')) return;
  url.query.push(...SORT_QUERY.map((q) => ({ ...q })));
  patched++;
});

fs.writeFileSync(POSTMAN, `${JSON.stringify(col, null, 2)}\n`);
console.log(`Postman: added sort params to ${patched} GET requests.`);
