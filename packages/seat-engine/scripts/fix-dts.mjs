// tsc keeps ".ts" specifiers inside emitted .d.ts files. Consumers need ".js".
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
let fixed = 0;
for (const f of readdirSync(dist)) {
  if (!f.endsWith('.d.ts')) continue;
  const p = join(dist, f);
  const before = readFileSync(p, 'utf8');
  const after = before.replace(/(from\s+['"]\.{1,2}\/[^'"]+)\.ts(['"])/g, '$1.js$2');
  if (after !== before) {
    writeFileSync(p, after);
    fixed++;
  }
}
console.log(`seat-engine: fixed ${fixed} declaration files`);
