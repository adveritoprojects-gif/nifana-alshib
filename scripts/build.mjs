#!/usr/bin/env node
/**
 * Production build: lint + syntax-check the ES modules + emit a static
 * `dist/` folder that can be published straight to Netlify.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

console.log('› lint');
execFileSync(process.execPath, [join(root, 'scripts', 'lint.mjs')], { stdio: 'inherit' });

console.log('› syntax check (node --check)');
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
for (const file of walk(join(root, 'js'))) {
  if (extname(file) === '.js') execFileSync(process.execPath, ['--check', file]);
}

console.log('› collect');
if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

cpSync(join(root, 'index.html'), join(dist, 'index.html'));
cpSync(join(root, 'css'), join(dist, 'css'), { recursive: true });
cpSync(join(root, 'js'), join(dist, 'js'), { recursive: true });
mkdirSync(join(dist, 'assets'), { recursive: true });
for (const name of ['couple.webp', 'couple-fallback.png']) {
  const from = join(root, 'assets', name);
  if (existsSync(from)) cpSync(from, join(dist, 'assets', name));
}

const size = (file) => statSync(file).size;
const total = walk(dist).reduce((sum, file) => sum + size(file), 0);
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

console.log(`\n✓ build complete → dist/ (${kb(total)} total)`);
for (const file of walk(dist)) {
  console.log(`   ${kb(size(file)).padStart(10)}  ${file.slice(dist.length + 1)}`);
}

const index = readFileSync(join(dist, 'index.html'), 'utf8');
const inline = (index.match(/data:image\//g) || []).length;
if (inline) console.log(`  note: ${inline} inlined image(s) still in index.html`);
console.log('\nPublish directory: dist/ · Build command: npm run build');
