/**
 * ALSHIB & NIFANA — invitation runtime.
 * Small, dependency-free modules; every one returns its own cleanup.
 */
import { initReveal } from './modules/reveal.js';
import { initParallax } from './modules/parallax.js';
import { initAmbient } from './modules/petals.js';
import { initCountdown } from './modules/countdown.js';
import { initHero } from './modules/hero.js';

const cleanups = [];

function boot() {
  cleanups.push(initHero());
  cleanups.push(initReveal());
  cleanups.push(initParallax());
  cleanups.push(initAmbient());
  cleanups.push(initCountdown());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

window.addEventListener(
  'pagehide',
  () => {
    while (cleanups.length) {
      const fn = cleanups.pop();
      try {
        fn();
      } catch (error) {
        /* cleanup is best effort */
      }
    }
  },
  { once: true }
);
