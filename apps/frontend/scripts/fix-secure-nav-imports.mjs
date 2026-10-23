import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.join(__dirname, "..", "src");

const NAV_FN = "navigateToEntityShell";
const NAV_IMPORT =
  'import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";';

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (/\.tsx$/.test(ent.name)) files.push(p);
  }
  return files;
}

let fixed = 0;
for (const file of walk(SRC_ROOT)) {
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes(NAV_FN) || src.includes(NAV_IMPORT)) continue;
  const idx = src.indexOf("\n");
  src = `${src.slice(0, idx + 1)}${NAV_IMPORT}\n${src.slice(idx + 1)}`;
  fs.writeFileSync(file, src);
  fixed += 1;
}
console.log(`Added import to ${fixed} files.`);
