// Pointer interactions shared by every public page: glyphs that dodge the cursor, and 3D card tilt.
// Each effect animates its own wrapper element, so it never fights the scroll animations on the parent.
import gsap from 'gsap';

export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
const lite = () => document.documentElement.classList.contains('lite');

// Wrap an element's children in an inner span the interaction can move freely
function wrapInner(el, className) {
  const existing = el.querySelector(`:scope > .${className}`);
  if (existing) return existing;
  const inner = document.createElement('span');
  inner.className = className;
  inner.append(...el.childNodes);
  el.append(inner);
  return inner;
}

// ---------- Glyphs scatter away from the cursor ----------
export function cursorGlyphs(selector = '.glyph') {
  if (lite()) return;
  const glyphs = [...document.querySelectorAll(selector)].map((g) => {
    const push = wrapInner(g, 'glyph__push');
    return {
      el: g,
      x: gsap.quickTo(push, 'x', { duration: 0.7, ease: 'power3.out' }),
      y: gsap.quickTo(push, 'y', { duration: 0.7, ease: 'power3.out' }),
      r: gsap.quickTo(push, 'rotation', { duration: 0.9, ease: 'power3.out' }),
    };
  });
  if (!glyphs.length) return;

  let frame = 0;
  let px = 0;
  let py = 0;
  const update = () => {
    frame = 0;
    for (const g of glyphs) {
      const r = g.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = cx - px;
      const dy = cy - py;
      const dist = Math.hypot(dx, dy) || 1;
      const reach = 220;
      if (dist < reach) {
        const k = ((reach - dist) / reach) ** 1.5 * 110;
        g.x((dx / dist) * k);
        g.y((dy / dist) * k);
        g.r((dx > 0 ? 1 : -1) * k * 0.4);
      } else {
        g.x(0);
        g.y(0);
        g.r(0);
      }
    }
  };
  addEventListener(
    'pointermove',
    (e) => {
      px = e.clientX;
      py = e.clientY;
      frame ||= requestAnimationFrame(update);
    },
    { passive: true },
  );
}

// ---------- 3D tilt toward the cursor, with a glare ----------
// host: element that listens; target: element that tilts (defaults to host's first .frame)
export function tilt(host, target = host.querySelector('.frame') || host, { max = 10, lift = 30 } = {}) {
  if (lite() || !finePointer() || host.dataset.tilt) return;
  host.dataset.tilt = '1';
  host.classList.add('tilt-host');
  target.classList.add('tilt');
  const glare = document.createElement('span');
  glare.className = 'tilt__glare';
  glare.setAttribute('aria-hidden', 'true');
  target.append(glare);

  const rx = gsap.quickTo(target, 'rotationX', { duration: 0.5, ease: 'power3.out' });
  const ry = gsap.quickTo(target, 'rotationY', { duration: 0.5, ease: 'power3.out' });
  const z = gsap.quickTo(target, 'z', { duration: 0.5, ease: 'power3.out' });

  host.addEventListener('pointermove', (e) => {
    const r = target.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    ry(nx * max * 2);
    rx(-ny * max * 2);
    z(lift);
    target.style.setProperty('--gx', `${(nx + 0.5) * 100}%`);
    target.style.setProperty('--gy', `${(ny + 0.5) * 100}%`);
  });
  host.addEventListener('pointerleave', () => {
    rx(0);
    ry(0);
    z(0);
  });
}

export function tiltAll(selector, options) {
  document.querySelectorAll(selector).forEach((el) => tilt(el, undefined, options));
}
