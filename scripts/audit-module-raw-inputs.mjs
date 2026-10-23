/**
 * Phase 0.8 — flag raw `<input>` / `<textarea>` on integrated module forms.
 *
 * Scope: apps/frontend/src/components/modules/ (recursive .tsx)
 *
 * Allowed without allowlist entry:
 * - type date | month | checkbox | radio | hidden | file (matches field-kind APPROVED_RAW_INPUT_TYPES)
 * - readOnly / read-only mirrors (tabIndex={-1} optional)
 * - `<textarea>` with readOnly
 *
 * Everything else must be listed in scripts/module-raw-input-allowlist.json until migrated
 * to RestrictedInput (tracked G-* gaps in global-input-validation-rollout.local.md).
 *
 * Run: node scripts/audit-module-raw-inputs.mjs
 * CI: npm run audit:module-raw-inputs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulesRoot = path.join(
  repoRoot,
  'apps/frontend/src/components/modules',
);
const allowlistPath = path.join(
  repoRoot,
  'scripts/module-raw-input-allowlist.json',
);

const APPROVED_TYPES = new Set([
  'date',
  'month',
  'checkbox',
  'radio',
  'hidden',
  'file',
  /** Debounced list / matrix filter only — cap via sanitizer + *_INPUT_LIMITS (rollout doc). */
  'search',
]);

/** @type {{ files?: string[], lines?: string[] }} */
const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
const allowFiles = new Set(allowlist.files ?? []);
const allowLines = new Set(allowlist.lines ?? []);

function walkTsx(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTsx(full, acc);
    else if (ent.name.endsWith('.tsx')) acc.push(full);
  }
  return acc;
}

function relPosix(filePath) {
  return path
    .relative(repoRoot, filePath)
    .split(path.sep)
    .join('/');
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split('\n').length;
}

function extractTags(content, tagName) {
  const results = [];
  const re = new RegExp(`<${tagName}\\b`, 'g');
  let m;
  while ((m = re.exec(content))) {
    const start = m.index;
    let i = start + m[0].length;
    let quote = null;
    while (i < content.length) {
      const ch = content[i];
      if (quote) {
        if (ch === quote && content[i - 1] !== '\\') quote = null;
        i += 1;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch;
        i += 1;
        continue;
      }
      if (ch === '>') {
        const tagSlice = content.slice(start, i + 1);
        results.push({
          tagSlice,
          line: lineNumberAt(content, start),
        });
        break;
      }
      i += 1;
    }
  }
  return results;
}

function hasApprovedInputType(tagSlice) {
  const typeMatch =
    tagSlice.match(/\btype\s*=\s*\{?\s*["'`]([^"'`]+)["'`]\s*\}?/i) ??
    tagSlice.match(/\btype\s*=\s*\{([^}]+)\}/);
  if (!typeMatch) {
    return false;
  }
  const raw = typeMatch[1].trim().replace(/['"`]/g, '');
  return APPROVED_TYPES.has(raw);
}

function isReadOnlyMirror(tagSlice) {
  if (/\breadOnly\b/i.test(tagSlice)) {
    return true;
  }
  if (/\breadonly\b/i.test(tagSlice)) {
    return true;
  }
  return false;
}

function isAllowed(fileRel, line, tagName, tagSlice) {
  if (allowFiles.has(fileRel)) {
    return true;
  }
  const key = `${fileRel}:${line}`;
  if (allowLines.has(key)) {
    return true;
  }
  if (tagName === 'input' && hasApprovedInputType(tagSlice)) {
    return true;
  }
  if (isReadOnlyMirror(tagSlice)) {
    return true;
  }
  return false;
}

const violations = [];

for (const file of walkTsx(modulesRoot)) {
  const fileRel = relPosix(file);
  const content = fs.readFileSync(file, 'utf8');

  for (const tagName of ['input', 'textarea']) {
    for (const { tagSlice, line } of extractTags(content, tagName)) {
      if (isAllowed(fileRel, line, tagName, tagSlice)) {
        continue;
      }
      const preview = tagSlice.replace(/\s+/g, ' ').slice(0, 120);
      violations.push({
        file: fileRel,
        line,
        tag: tagName,
        preview,
      });
    }
  }
}

if (violations.length === 0) {
  console.log(
    '✓ Module raw-input audit passed — no unallowlisted typed controls.',
  );
  process.exit(0);
}

console.error(
  `✗ Module raw-input audit: ${violations.length} unallowlisted control(s):\n`,
);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  <${v.tag}>  ${v.preview}`);
}
console.error(
  '\nAdd approved exceptions to scripts/module-raw-input-allowlist.json (files or file:line).',
);
console.error(
  'Prefer RestrictedInput + *_INPUT_LIMITS for new typed fields (rule 24).',
);
process.exit(1);
