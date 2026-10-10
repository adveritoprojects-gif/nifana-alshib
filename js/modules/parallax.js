/**
 * Parallax — decorative layers drift slowly against the scroll.
 * Writes a single custom property per frame so transforms stay on the
 * compositor; elements outside the viewport are skipped entirely.
 */
export function initParallax() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || typeof IntersectionObserver === 'undefined') return () => {};

  const nodes = Array.from(document.querySelectorAll('[data-parallax]'));
  if (!nodes.length) return () => {};

  const visible = new Set();
  let ticking = false;
  let raf = 0;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      schedule();
    },
    { rootMargin: '15% 0px 15% 0px' }
  );

  nodes.forEach((el) => io.observe(el));

  function strength() {
    const w = window.innerWidth;
    if (w < 640) return 0.35;
    if (w < 1024) return 0.6;
    return 1;
  }

  function apply() {
    ticking = false;
    const vh = window.innerHeight;
    const s = strength();
    for (const el of visible) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > vh + 80) continue;
      const offset = rect.top + rect.height / 2 - vh / 2;
      const factor = parseFloat(el.dataset.parallax) || 0.05;
      el.style.setProperty('--py', `${(-offset * factor * s).toFixed(1)}px`);
    }
  }

  function schedule() {
    if (ticking) return;
    ticking = true;
    raf = requestAnimationFrame(apply);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  schedule();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    io.disconnect();
    visible.clear();
  };
}
