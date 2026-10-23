import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.join(__dirname, "..", "src");

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (/\.tsx$/.test(ent.name)) files.push(p);
  }
  return files;
}

const NAV_FN = "navigateToEntityShell";
const NAV_IMPORT =
  'import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";';

function ensureImport(src) {
  if (src.includes(NAV_FN)) return src;
  if (!src.includes(NAV_IMPORT)) {
    const idx = src.indexOf("\n");
    return `${src.slice(0, idx + 1)}${NAV_IMPORT}\n${src.slice(idx + 1)}`;
  }
  return src;
}

/** router.push(fooHref(x)) / router.replace(...) */
const pushRe =
  /router\.(push|replace)\((([a-zA-Z0-9_]+)\(([^)]+)\))\)/g;

let fileCount = 0;
let replaceCount = 0;

for (const file of walk(SRC_ROOT)) {
  if (file.includes("secure-entity-navigation.ts")) continue;
  let src = fs.readFileSync(file, "utf8");
  const orig = src;

  src = src.replace(pushRe, (full, method, hrefCall, fnName, args) => {
    if (!fnName.endsWith("Href")) return full;
    const arg = args.trim();
    if (!arg || arg === '""' || arg === "''") return full;
    replaceCount += 1;
    return `${NAV_FN}(router, ${hrefCall}, ${arg}, '${method === "replace" ? "replace" : "push"}')`;
  });

  if (src !== orig) {
    src = ensureImport(src);
    fs.writeFileSync(file, src);
    fileCount += 1;
  }
}

console.log(`Updated ${fileCount} files, ${replaceCount} navigation calls.`);
