// Fixed chrome: menu, progress bar, prev/next buttons, anchor scrolling, lite toggle.
// Works with or without Lenis (lite mode passes null). Every piece is optional, so inner pages can use it too.

const root = document.documentElement;

function sectionTop(el) {
  // Pinned sections are wrapped in a GSAP .pin-spacer; measure that instead
  const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
  const top = box.getBoundingClientRect().top + scrollY;
  return el.dataset.anchor === 'end' ? top + box.offsetHeight - innerHeight : top;
}

export function setupChrome(lenis) {
  // immediate: jump without animating (used when arriving on the page with a #section link)
  const go = (target, { immediate = false } = {}) => {
    // Pins can grow the page in the same frame; Lenis would clamp to its old height without a fresh measure
    if (immediate) lenis?.resize();
    const y = typeof target === 'number' ? target : sectionTop(target);
    if (lenis) lenis.scrollTo(y, immediate ? { immediate: true, force: true } : { duration: 1.4 });
    else if (immediate) scrollTo({ top: y, behavior: 'instant' });
    else scrollTo({ top: y, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  // Anchors
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    closeMenu();
    go(id === 'top' ? 0 : target);
  });

  // Menu (phones and tablets): fades in, keeps keyboard focus inside, and hands focus back on close
  const menu = document.getElementById('menu');
  const menuBtn = document.querySelector('.menu-btn');
  const menuIcon = menuBtn?.innerHTML;
  const closeIcon =
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  function openMenu() {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('is-open'));
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'Close menu');
    menuBtn.innerHTML = closeIcon;
    root.style.overflow = 'hidden';
    lenis?.stop();
    menu.querySelector('a')?.focus({ preventScroll: true });
  }
  function closeMenu({ restoreFocus = true } = {}) {
    if (!menu || menu.hidden) return;
    menu.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open menu');
    menuBtn.innerHTML = menuIcon;
    root.style.overflow = '';
    menu.hidden = true;
    lenis?.start();
    if (restoreFocus) menuBtn.focus({ preventScroll: true });
  }
  menuBtn?.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
    // Tab cycles between the menu links and the close button while the menu is open
    if (e.key !== 'Tab' || !menu || menu.hidden) return;
    const stops = [menuBtn, ...menu.querySelectorAll('a')];
    const i = stops.indexOf(document.activeElement);
    const nextStop = stops[(i + (e.shiftKey ? -1 : 1) + stops.length) % stops.length];
    e.preventDefault();
    nextStop.focus();
  });
  // Widening past the phone layout hides the menu button, so close the menu with it
  matchMedia('(min-width: 901px)').addEventListener('change', (e) => e.matches && closeMenu({ restoreFocus: false }));

  // On the home page, the bar marks the section being read (Events, Mentors) instead of always "Home"
  const spyLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')]
    .map((a) => ({ a, target: document.getElementById(a.getAttribute('href').slice(1)) }))
    .filter((l) => l.target);
  const homeLink = spyLinks.find((l) => l.a.getAttribute('href') === '#top');
  function spy() {
    if (!spyLinks.length) return;
    const line = innerHeight * 0.35;
    let active = homeLink;
    spyLinks.forEach((l) => {
      if (l === homeLink) return;
      const r = l.target.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) active = l;
    });
    spyLinks.forEach((l) => (l === active ? l.a.setAttribute('aria-current', l === homeLink ? 'page' : 'location') : l.a.removeAttribute('aria-current')));
  }

  // Progress bar, header backing, header logo
  const fill = document.querySelector('.progress__fill');
  const head = document.querySelector('.site-head');
  const logo = document.querySelector('.site-head__logo');

  function onScroll() {
    const max = root.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    if (fill) fill.style.transform = `scaleX(${p})`;
    head?.classList.toggle('is-scrolled', scrollY > 8);
    if (logo && !logo.dataset.always) logo.classList.toggle('is-visible', scrollY > innerHeight * 0.8);
    spy();
  }
  if (lenis) lenis.on('scroll', onScroll);
  else addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Lite toggle (stored, applied on reload)
  const toggle = document.querySelector('.lite-toggle');
  if (toggle) {
    const isLite = root.classList.contains('lite');
    toggle.setAttribute('aria-pressed', String(isLite));
    toggle.querySelector('.lite-toggle__state').textContent = isLite ? 'on' : 'off';
    toggle.addEventListener('click', () => {
      setLitePref(!isLite);
      location.reload();
    });
  }

  // Scroll to a section by id (used by the terminal)
  return (id, opts) => {
    const target = document.getElementById(id);
    if (target) go(id === 'top' ? 0 : target, opts);
  };
}

export function setLitePref(on) {
  try {
    localStorage.setItem('hope-lite', on ? '1' : '0');
  } catch (e) {
    /* storage blocked: the choice lasts for this page view only */
  }
}

// Secret door to the admin area: click the footer HOPE wordmark five times within three seconds.
// It only saves typing the address; the admin area itself always asks for an admin login.
export function setupSecretDoor() {
  const mark = document.querySelector('.foot__mark');
  if (!mark) return;
  let clicks = [];
  mark.addEventListener('click', () => {
    const now = Date.now();
    clicks = clicks.filter((t) => now - t < 3000).concat(now);
    if (clicks.length >= 5) location.href = '/hope-hq/';
  });
}
