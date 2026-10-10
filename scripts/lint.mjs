#!/usr/bin/env node
/**
 * Dependency-free lint for the invitation.
 * Verifies structure, content preservation, asset references, accessibility
 * attributes and that every SVG <use> resolves to a real symbol.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const html = readFileSync(join(root, 'index.html'), 'utf8');

/* ---------------------------------------------------------------- structure */
const requiredIds = [
  'hero', 'portrait', 'couple', 'events', 'countdown', 'location', 'timer',
  'cd-days', 'cd-hours', 'cd-mins', 'cd-secs', 'hero-title', 'portrait-title',
  'couple-title', 'events-title', 'countdown-title', 'location-title',
];
for (const id of requiredIds) {
  if (!new RegExp(`id="${id}"`).test(html)) fail(`missing required id: #${id}`);
}
if (!/<footer[\s>]/.test(html)) fail('missing <footer>');
if (!/<main[\s>]/.test(html)) fail('missing <main>');
if (!/<h1[\s>]/.test(html)) fail('missing <h1>');

/* ------------------------------------------------- content preservation */
const requiredCopy = [
  'The Wedding Of', 'ALSHIB', 'NIFANA', '28 &amp; 29 December 2026',
  'Bismillah', 'Two families, joined in faith and love',
  'Together with our families, we joyfully invite you to',
  'S/O. Abdul Haris &amp; Jameela', 'D/O. Jafar Shathik &amp; Nasiya',
  'Celebration', 'Wedding Events', 'Nikah', 'Reception',
  'Monday, Dec 28 2026 · 10:00 AM', 'Tuesday, Dec 29 2026 · 5:00 – 10:00 PM',
  'Saleena Palace Auditorium',
  'Pokkunnu, Mankave Pantheerankave Road, Kozhikode, Kerala 673014',
  'White Castle Auditorium',
  'Mathottam, Kannanchery, Kozhikode, Kerala 673003',
  'Save The Date', 'Counting Down To Forever',
  'Find Us', 'Venue &amp; Directions', 'Nikah · Dec 28', 'Reception · Dec 29',
  'Alshib &amp; Nifana', 'With love, from our families',
  'Wedding couple illustration in maroon and gold',
];
for (const text of requiredCopy) {
  if (!html.includes(text)) fail(`content missing from markup: "${text}"`);
}

/* ------------------------------------------------------- working destinations */
const requiredLinks = [
  'https://maps.app.goo.gl/7J4er99zmMJGyKjG8?g_st=ac',
  'https://maps.app.goo.gl/KsUDU3YjbCmj6Qq66?g_st=ac',
  'https://maps.google.com/maps?q=Saleena+Palace+Auditorium+Pokkunnu+Kozhikode+Kerala+673014&output=embed',
  'https://maps.google.com/maps?q=White+Castle+Auditorium+Mathottam+Kozhikode+Kerala+673003&output=embed',
];
for (const href of requiredLinks) {
  const n = html.split(href).length - 1;
  if (n === 0) fail(`destination missing: ${href}`);
}

/* ------------------------------------------------------------ local assets */
const refs = [...html.matchAll(/(?:src|srcset|href)="(\.\/[^"]+)"/g)].map((m) => m[1]);
for (const ref of refs) {
  const clean = ref.split(' ')[0].replace(/^\.\//, '');
  if (!existsSync(join(root, clean))) fail(`referenced file not found: ${ref}`);
}

/* ------------------------------------------------------------- accessibility */
const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
for (const img of imgs) {
  if (!/\balt="/.test(img)) fail(`image without alt: ${img.slice(0, 80)}`);
  if (!/\bwidth="/.test(img) || !/\bheight="/.test(img)) {
    warn(`image without intrinsic size (CLS risk): ${img.slice(0, 60)}`);
  }
}
const frames = [...html.matchAll(/<iframe\b[^>]*>/g)].map((m) => m[0]);
for (const frame of frames) {
  if (!/\btitle="/.test(frame)) fail(`iframe without title: ${frame.slice(0, 80)}`);
  if (!/loading="lazy"/.test(frame)) warn(`iframe not lazy: ${frame.slice(0, 60)}`);
}
const blanks = [...html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].map((m) => m[0]);
for (const a of blanks) {
  if (!/rel="[^"]*noopener/.test(a)) fail(`target="_blank" without noopener: ${a.slice(0, 80)}`);
}
if (/href="#"/.test(html)) fail('dead link found: href="#"');
if (/<button[^>]*>\s*<\/button>/.test(html)) fail('empty button found');

/* ------------------------------------------------------------ svg references */
const defined = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const used = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
for (const id of used) {
  if (!defined.has(id)) fail(`<use href="#${id}"> has no matching id`);
}
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const seen = new Set();
for (const id of ids) {
  if (seen.has(id)) fail(`duplicate id: #${id}`);
  seen.add(id);
}

/* -------------------------------------------------------------------- files */
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const cssFiles = walk(join(root, 'css')).filter((f) => extname(f) === '.css');
for (const file of cssFiles) {
  const text = readFileSync(file, 'utf8');
  const open = (text.match(/\{/g) || []).length;
  const close = (text.match(/\}/g) || []).length;
  if (open !== close) fail(`${file}: unbalanced braces (${open} open, ${close} close)`);
  if (/[\u0080-\uFFFF]/.test(text.replace(/·|–|—|“”|&[a-z]+;/g, ''))) {
    warn(`${file}: contains non-ascii characters that are not entities`);
  }
}

const jsFiles = walk(join(root, 'js')).filter((f) => extname(f) === '.js');
for (const file of jsFiles) {
  const text = readFileSync(file, 'utf8');
  if (!text.trim()) fail(`${file} is empty`);
}

/* ------------------------------------------------------------------ report */
for (const w of warnings) console.warn(`  warn  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  error ${e}`);
  console.error(`\n✖ lint failed: ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
}
console.log(
  `✓ lint passed — ${requiredIds.length} ids, ${requiredCopy.length} copy checks, ` +
    `${requiredLinks.length} destinations, ${used.length} svg refs, ` +
    `${cssFiles.length} stylesheets, ${jsFiles.length} modules ` +
    `(${warnings.length} warning(s))`
);
