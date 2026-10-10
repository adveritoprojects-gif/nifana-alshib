/**
 * Countdown — targets the Nikah at 28 December 2026, 10:00 local time.
 * Only the four digit nodes are touched, and only when their value changes,
 * so the timer never re-renders the page around it.
 */
const TARGET = new Date(2026, 11, 28, 10, 0, 0); // 28 Dec 2026, 10:00 (local)
const DAY = 86400000;
const HOUR = 3600000;
const MIN = 60000;
const SEC = 1000;

function pad(n) {
  return String(n).padStart(2, '0');
}

function setUnit(el, value, tick) {
  if (!el || el.textContent === value) return;
  el.textContent = value;
  if (!tick) return;
  el.classList.remove('is-tick');
  // force a reflow so the animation can restart on the next change
  void el.offsetWidth;
  el.classList.add('is-tick');
}

export function initCountdown() {
  const timer = document.getElementById('timer');
  if (!timer) return () => {};

  const days = document.getElementById('cd-days');
  const hours = document.getElementById('cd-hours');
  const mins = document.getElementById('cd-mins');
  const secs = document.getElementById('cd-secs');
  const status = document.getElementById('cd-status');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let timerId = 0;
  let statusMinute = -1;

  function expired() {
    timer.innerHTML =
      '<div class="unit unit--married"><div class="num">&#10084;</div><div class="lab">Married</div></div>';
    if (status) status.textContent = 'The wedding has begun. Congratulations, Alshib and Nifana!';
  }

  function writeStatus(remaining) {
    if (!status) return;
    const minute = Math.ceil(remaining / MIN);
    if (minute === statusMinute) return;
    statusMinute = minute;
    const d = Math.floor(remaining / DAY);
    const h = Math.floor((remaining % DAY) / HOUR);
    status.textContent = d > 0
      ? `${d} day${d === 1 ? '' : 's'} and ${h} hour${h === 1 ? '' : 's'} until the wedding.`
      : `${h} hour${h === 1 ? '' : 's'} until the wedding.`;
  }

  function update(tick) {
    const remaining = TARGET.getTime() - Date.now();
    if (remaining <= 0) {
      expired();
      clearInterval(timerId);
      return;
    }

    const d = Math.floor(remaining / DAY);
    const h = Math.floor((remaining % DAY) / HOUR);
    const m = Math.floor((remaining % HOUR) / MIN);
    const s = Math.floor((remaining % MIN) / SEC);

    const animate = tick && !reduced;
    setUnit(days, pad(d), false);
    setUnit(hours, pad(h), false);
    setUnit(mins, pad(m), false);
    setUnit(secs, pad(s), animate);
    writeStatus(remaining);
  }

  update(false);

  function start() {
    clearInterval(timerId);
    const delay = 1000 - (Date.now() % 1000);
    timerId = setTimeout(() => {
      update(true);
      timerId = setInterval(() => update(true), 1000);
    }, delay);
  }

  function onVisibility() {
    if (document.hidden) {
      clearInterval(timerId);
      timerId = 0;
    } else if (!timerId) {
      update(false);
      start();
    }
  }

  start();
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    clearInterval(timerId);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
