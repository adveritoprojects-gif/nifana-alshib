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

/* ------------------------------------------------- share preview metadata */
const SITE = 'https://nifana-alshib.vercel.app/';
const PREVIEW = `${SITE}images/wedding-invitation-preview.jpg`;

if (!html.includes(`<title>Alshib &amp; Nifana — Wedding Invitation</title>`)) {
  fail('missing/incorrect <title>');
}
const mustMeta = [
  ['name="description"', 'You are cordially invited to celebrate the wedding of Alshib &amp; Nifana on 28 &amp; 29 December 2026.'],
  ['property="og:type"', 'website'],
  ['property="og:site_name"', 'Alshib &amp; Nifana'],
  ['property="og:title"', 'Alshib &amp; Nifana — Wedding Invitation'],
  ['property="og:description"', 'You are cordially invited to celebrate the wedding of Alshib &amp; Nifana on 28 &amp; 29 December 2026.'],
  ['property="og:url"', SITE],
  ['property="og:image"', PREVIEW],
  ['property="og:image:width"', '1200'],
  ['property="og:image:height"', '630'],
  ['property="og:image:alt"', 'Alshib and Nifana wedding invitation, 28 and 29 December 2026'],
  ['name="twitter:card"', 'summary_large_image'],
  ['name="twitter:title"', 'Alshib &amp; Nifana — Wedding Invitation'],
  ['name="twitter:description"', 'You are cordially invited to celebrate the wedding of Alshib &amp; Nifana.'],
  ['name="twitter:image"', PREVIEW],
];
for (const [attr, val] of mustMeta) {
  const re = new RegExp(`<meta[^>]*${attr.replace(/[:[\]]/g, '\\$&')}[^>]*content="${val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`);
  if (!re.test(html)) fail(`missing/incorrect metadata: ${attr} = "${val}"`);
}
if (!html.includes(`<link rel="canonical" href="${SITE}" />`)) {
  fail(`missing/incorrect canonical link: ${SITE}`);
}
/* each og/twitter property must appear exactly once */
for (const prop of ['og:image', 'og:title', 'og:description', 'og:url', 'twitter:card', 'twitter:image']) {
  const n = html.split(`="${prop}"`).length - 1;
  if (n !== 1) fail(`expected exactly 1 ${prop} tag, found ${n}`);
}
/* no stray host URLs left in metadata */
for (const meta of html.match(/<(?:meta|link)\b[^>]*>/g) || []) {
  if (/(localhost|netlify|\.vercel\.app\/_)/.test(meta)) fail(`metadata references non-production URL: ${meta.slice(0, 90)}`);
}
/* the share image must exist on disk and be a real 1200x630 image */
const previewPath = join(root, 'public', 'images', 'wedding-invitation-preview.jpg');
if (!existsSync(previewPath)) fail(`share preview image missing: public/images/wedding-invitation-preview.jpg`);
else {
  const buf = readFileSync(previewPath);
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  if (!isJpeg && !isPng) fail('share preview image is not a valid JPEG/PNG');
  // JPEG: scan for SOF0/SOF2 frame header to read dimensions
  if (isJpeg) {
    let i = 2, dims = null;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        dims = { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
        break;
      }
      i += 2 + len;
    }
    if (!dims) fail('could not read preview image dimensions');
    else if (dims.w !== 1200 || dims.h !== 630) fail(`preview image is ${dims.w}x${dims.h}, expected 1200x630`);
  }
  if (buf.length > 300 * 1024) warn(`preview image is ${(buf.length / 1024).toFixed(0)} kB (target < 300 kB)`);
}

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
    `${cssFiles.length} stylesheets, ${jsFiles.length} modules, ` +
    `${mustMeta.length + 1} share-meta tags, 1 preview image ` +
    `(${warnings.length} warning(s))`
);
