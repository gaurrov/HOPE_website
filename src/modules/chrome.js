// Fixed chrome: menu, progress bar, prev/next buttons, anchor scrolling, lite toggle.
// Works with or without Lenis (lite mode passes null).

const root = document.documentElement;

function sectionTop(el) {
  // Pinned sections are wrapped in a GSAP .pin-spacer; measure that instead
  const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
  const top = box.getBoundingClientRect().top + scrollY;
  return el.dataset.anchor === 'end' ? top + box.offsetHeight - innerHeight : top;
}

export function setupChrome(lenis) {
  const go = (target) => {
    const y = typeof target === 'number' ? target : sectionTop(target);
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
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

  // Menu with a circular reveal from the button
  const menu = document.getElementById('menu');
  const menuBtn = document.querySelector('.menu-btn');
  function openMenu() {
    const r = menuBtn.getBoundingClientRect();
    menu.style.setProperty('--mx', `${r.left + r.width / 2}px`);
    menu.style.setProperty('--my', `${r.top + r.height / 2}px`);
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('is-open'));
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'Close menu');
    lenis?.stop();
  }
  function closeMenu() {
    if (menu.hidden) return;
    menu.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open menu');
    menu.addEventListener('transitionend', () => !menu.classList.contains('is-open') && (menu.hidden = true), { once: true });
    lenis?.start();
  }
  menuBtn.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());

  // Progress bar, header logo, prev/next
  const fill = document.querySelector('.progress__fill');
  const logo = document.querySelector('.site-head__logo');
  const prev = document.querySelector('.step-btn--prev');
  const next = document.querySelector('.step-btn--next');
  const steps = [...document.querySelectorAll('[data-step]')];

  function onScroll() {
    const max = root.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    fill.style.transform = `scaleX(${p})`;
    logo.classList.toggle('is-visible', scrollY > innerHeight * 0.8);
    prev.disabled = scrollY < 10;
    // The hero has its own scroll-down button, so "next" only appears after it
    next.disabled = p > 0.995 || scrollY < innerHeight * 0.5;
  }
  if (lenis) lenis.on('scroll', onScroll);
  else addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const currentIndex = () => {
    const y = scrollY + 4;
    let idx = 0;
    steps.forEach((s, i) => sectionTop(s) <= y && (idx = i));
    return idx;
  };
  next.addEventListener('click', () => {
    const t = steps[currentIndex() + 1];
    t ? go(t) : go(root.scrollHeight);
  });
  prev.addEventListener('click', () => {
    const i = currentIndex();
    const here = sectionTop(steps[i]);
    // Inside a long pinned section, go back to its start first
    go(scrollY - here > 8 ? steps[i] : steps[Math.max(0, i - 1)]);
  });

  // Lite toggle (stored, applied on reload)
  const toggle = document.querySelector('.lite-toggle');
  const isLite = root.classList.contains('lite');
  toggle.setAttribute('aria-pressed', String(isLite));
  toggle.querySelector('.lite-toggle__state').textContent = isLite ? 'on' : 'off';
  toggle.addEventListener('click', () => {
    setLitePref(!isLite);
    location.reload();
  });
}

export function setLitePref(on) {
  try {
    localStorage.setItem('hope-lite', on ? '1' : '0');
  } catch (e) {
    /* storage blocked: the choice lasts for this page view only */
  }
}
