/**
 * Static sanity check for the extension. Run with:  node tools/verify.mjs
 *
 * 1. manifest.json parses and every file it references exists
 * 2. every getElementById('x') id used by popup.js exists in popup.html
 * 3. every HTML id in popup.html is used somewhere (report only)
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const notes = [];

const read = (relative) => readFileSync(join(root, relative), 'utf8');

/* ---------------------------------------------------------- 1. manifest */

let manifest;
try {
  manifest = JSON.parse(read('manifest.json'));
} catch (error) {
  problems.push(`manifest.json is not valid JSON: ${error.message}`);
}

if (manifest) {
  const referenced = [
    manifest.action?.default_popup,
    ...Object.values(manifest.action?.default_icon ?? {}),
    ...Object.values(manifest.icons ?? {}),
  ].filter(Boolean);

  for (const file of new Set(referenced)) {
    if (!existsSync(join(root, file))) problems.push(`manifest references missing file: ${file}`);
  }

  if (manifest.manifest_version !== 3) problems.push('manifest_version should be 3');
  if (!manifest.permissions?.includes('storage')) problems.push('"storage" permission is missing');
}

/* ------------------------------------------------------------- 2. ids */

const html = read('popup.html');
const js = read('popup.js');

const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
const usedIds = new Set([...js.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1]));

for (const id of usedIds) {
  if (!htmlIds.has(id)) problems.push(`popup.js uses getElementById('${id}') but popup.html has no such id`);
}

for (const id of htmlIds) {
  if (!usedIds.has(id)) notes.push(`popup.html id="${id}" is never looked up in popup.js`);
}

/* --------------------------------------------------------- 3. modules */

for (const file of ['popup.js', 'src/config.js', 'src/storage.js', 'src/api.js', 'src/validation.js', 'src/mail-view.js']) {
  const source = read(file);
  for (const match of source.matchAll(/from\s+'(\.[^']+)'/g)) {
    const target = resolve(root, dirname(file), match[1]);
    if (!existsSync(target)) problems.push(`${file} imports missing module ${match[1]}`);
  }
}

/* ------------------------------------------------------------ report */

for (const note of notes) console.log(`note: ${note}`);

if (problems.length) {
  for (const problem of problems) console.error(`FAIL: ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`OK: manifest, ${htmlIds.size} html ids and module imports all check out.`);
}
