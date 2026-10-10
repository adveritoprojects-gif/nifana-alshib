/**
 * Scroll reveal — single IntersectionObserver for every animated block.
 * Adds `.is-in` once, then stops observing so nothing is kept alive.
 */
const SELECTOR = '[data-reveal]';

function showAll(root = document) {
  root.querySelectorAll(SELECTOR).forEach((el) => el.classList.add('is-in'));
}

export function initReveal() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nodes = Array.from(document.querySelectorAll(SELECTOR));

  if (reduced || typeof IntersectionObserver === 'undefined') {
    showAll();
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.16, rootMargin: '0px 0px -6% 0px' }
  );

  nodes.forEach((el) => io.observe(el));

  const onPageHide = () => io.disconnect();
  window.addEventListener('pagehide', onPageHide, { once: true });

  return () => {
    window.removeEventListener('pagehide', onPageHide);
    io.disconnect();
  };
}
