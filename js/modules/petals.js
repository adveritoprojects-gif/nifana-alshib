/**
 * Floating petals — a small, deterministic petal system.
 * Petals are pure CSS animations (no per-frame React/DOM state), never
 * intercept pointer events, and only run while their section is on screen.
 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TONES = {
  warm: ['#s-petal', '#s-petal', '#s-petal-gold', '#s-petal', '#s-petal-gold'],
  light: ['#s-petal-gold', '#s-petal', '#s-petal-gold', '#s-petal-gold'],
};

function makePetal(rand, tone, index) {
  const wrap = document.createElement('span');
  wrap.className = 'petal';
  wrap.setAttribute('aria-hidden', 'true');

  const fall = document.createElement('span');
  fall.className = 'petal__fall';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 26 34');
  svg.setAttribute('aria-hidden', 'true');

  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  const palette = TONES[tone] || TONES.warm;
  use.setAttribute('href', palette[index % palette.length]);
  svg.appendChild(use);
  fall.appendChild(svg);
  wrap.appendChild(fall);

  const size = 11 + rand() * 15;
  const mobile = window.innerWidth < 640;

  wrap.style.setProperty('--x', `${(rand() * 96 + 2).toFixed(2)}%`);
  wrap.style.setProperty('--size', `${(mobile ? size * 0.68 : size).toFixed(1)}px`);
  wrap.style.setProperty('--op', (0.32 + rand() * 0.45).toFixed(2));
  wrap.style.setProperty('--drift', `${(14 + rand() * 34).toFixed(0)}px`);
  wrap.style.setProperty('--sway-dur', `${(5 + rand() * 5).toFixed(1)}s`);
  fall.style.setProperty('--fall-dur', `${(14 + rand() * 14).toFixed(1)}s`);
  fall.style.setProperty('--fall-delay', `${(-rand() * 24).toFixed(1)}s`);
  fall.style.setProperty('--spin', `${(360 + rand() * 540).toFixed(0)}deg`);

  return wrap;
}

function makeSpark(rand) {
  const el = document.createElement('span');
  el.className = 'spark';
  el.setAttribute('aria-hidden', 'true');
  el.style.setProperty('--x', `${(rand() * 94 + 3).toFixed(2)}%`);
  el.style.setProperty('--y', `${(rand() * 88 + 6).toFixed(2)}%`);
  el.style.setProperty('--s', `${(2 + rand() * 4).toFixed(1)}px`);
  el.style.setProperty('--dur', `${(4 + rand() * 5).toFixed(1)}s`);
  el.style.setProperty('--delay', `${(-rand() * 8).toFixed(1)}s`);
  el.style.setProperty('--rise', `${(10 + rand() * 12).toFixed(1)}s`);
  return el;
}

function gate(layer, targetClass) {
  if (typeof IntersectionObserver === 'undefined') {
    layer.classList.add(targetClass);
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        layer.classList.toggle(targetClass, entry.isIntersecting);
      }
    },
    { threshold: 0.02 }
  );
  io.observe(layer);
  return () => io.disconnect();
}

export function initAmbient() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return () => {};

  const cleanups = [];

  document.querySelectorAll('[data-petals]').forEach((layer, i) => {
    const count = Math.min(parseInt(layer.dataset.petals, 10) || 0, 14);
    const tone = layer.dataset.petalTone || 'warm';
    const rand = mulberry32(0x9e37 + i * 7919);
    const frag = document.createDocumentFragment();
    for (let n = 0; n < count; n += 1) frag.appendChild(makePetal(rand, tone, n));
    layer.appendChild(frag);
    if (layer.closest('#hero')) layer.classList.add('is-on');
    else cleanups.push(gate(layer, 'is-on'));
  });

  document.querySelectorAll('[data-sparks]').forEach((layer, i) => {
    const count = Math.min(parseInt(layer.dataset.sparks, 10) || 0, 16);
    const rand = mulberry32(0x1f2e + i * 6151);
    const frag = document.createDocumentFragment();
    for (let n = 0; n < count; n += 1) frag.appendChild(makeSpark(rand));
    layer.appendChild(frag);
    if (layer.closest('#hero')) layer.classList.add('is-on');
    else cleanups.push(gate(layer, 'is-on'));
  });

  return () => cleanups.forEach((fn) => fn());
}
