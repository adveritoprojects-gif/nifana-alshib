/**
 * Hero — keeps the gold frame pinned to the viewport box (so the stroke
 * draws a perfectly even border at every size) and wires the scroll cue.
 */
export function initHero() {
  const hero = document.getElementById('hero');
  if (!hero) return () => {};

  const frame = hero.querySelector('.hero__frame');
  const rects = frame ? Array.from(frame.querySelectorAll('.frame-line')) : [];
  let raf = 0;

  function fitFrame() {
    raf = 0;
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    if (!w || !h || !rects.length) return;

    const outer = w < 640 ? 12 : 18;
    const inner = outer + 9;

    frame.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const inset = (rect, px) => {
      rect.setAttribute('x', px);
      rect.setAttribute('y', px);
      rect.setAttribute('width', Math.max(0, w - px * 2));
      rect.setAttribute('height', Math.max(0, h - px * 2));
    };

    inset(rects[0], outer);
    if (rects[1]) inset(rects[1], inner);
  }

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(fitFrame);
  }

  fitFrame();
  window.addEventListener('resize', schedule, { passive: true });

  let ro;
  if (typeof ResizeObserver === 'undefined') {
    window.addEventListener('load', schedule, { once: true });
  } else {
    ro = new ResizeObserver(schedule);
    ro.observe(hero);
  }

  const cue = hero.querySelector('.scroll-cue');
  const next = document.getElementById('portrait');
  const onCue = () => {
    if (!next) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    next.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };
  if (cue) cue.addEventListener('click', onCue);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', schedule);
    if (ro) ro.disconnect();
    if (cue) cue.removeEventListener('click', onCue);
  };
}
