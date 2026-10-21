import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { gallerySlots } from '../photos.js';
import { makeFrame } from '../frames.js';

const ring = document.querySelector('.ring');
const tilt = document.querySelector('.ring__tilt');
const spin = document.querySelector('.ring__spin');
const COUNT = 12;
let radius = 0;
let angle = 0;
let spinVel = 0; // extra spin from dragging, decays each frame

// Curved wall of photos wrapped around the camera.
export function buildRing() {
  for (let i = 0; i < COUNT; i++) {
    spin.append(makeFrame(gallerySlots[i % gallerySlots.length], i, 'ring__item'));
  }
  layoutRing();
  addEventListener('resize', layoutRing);
}

function layoutRing() {
  const w = Math.min(Math.max(innerWidth * 0.24, 170), 340);
  const h = w * 1.3;
  radius = (COUNT * w * 1.08) / (2 * Math.PI);
  ring.style.setProperty('--rw', `${w}px`);
  ring.style.setProperty('--rh', `${h}px`);
  spin.querySelectorAll('.ring__item').forEach((el, i) => {
    el.style.transform = `rotateY(${(i * 360) / COUNT}deg) translateZ(${-radius}px)`;
  });
  paint();
}

function paint() {
  // Push the ring towards the camera so the front panels read large and the sides curve past the edges
  spin.style.transform = `translateZ(${radius * 0.55}px) rotateY(${angle}deg)`;
}

// Where each letter flies when the hero scrolls away: [x vw, y vh, z px, rotateX, rotateY, rotateZ]
const SCATTER = [
  [-34, -18, 260, 25, -55, -18],
  [-6, -46, 420, 70, 10, 12],
  [12, 30, 300, -50, 35, 20],
  [36, -14, 200, 20, 60, -24],
];

// Full mode: spin the ring (faster while scrolling), hide hero content until the intro lands.
export function setupHero(lenis) {
  const letters = gsap.utils.toArray('.hero__mark .l');
  const rest = gsap.utils.toArray('.hero__sub, .hero__down');
  gsap.set([...letters, ...rest], { autoAlpha: 0 });
  gsap.set(ring, { autoAlpha: 0 });

  const tick = (_t, dt) => {
    angle -= dt * 0.006 + Math.abs(lenis.velocity) * 0.04;
    angle += spinVel;
    spinVel *= 0.94;
    paint();
  };
  let running = false;
  const run = (on) => {
    if (on === running) return;
    running = on;
    on ? gsap.ticker.add(tick) : gsap.ticker.remove(tick);
  };
  run(true);
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    onToggle: (self) => run(self.isActive),
  });

  // Scrolling away: the ring tilts back like a camera pitching up, the letters scatter in 3D
  const exit = gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
  });
  exit
    .to(tilt, { rotationX: -32, yPercent: 14, scale: 0.92, ease: 'none' }, 0)
    .to(ring, { autoAlpha: 0.25, ease: 'power1.in' }, 0)
    .fromTo(rest, { y: 0, autoAlpha: 1 }, { y: -60, autoAlpha: 0, ease: 'power1.in', duration: 0.5, immediateRender: false }, 0);
  letters.forEach((l, i) => {
    const [x, y, z, rx, ry, rz] = SCATTER[i];
    exit.to(
      l,
      { x: () => (innerWidth * x) / 100, y: () => (innerHeight * y) / 100, z, rotationX: rx, rotationY: ry, rotation: rz, ease: 'power2.in' },
      0,
    );
  });

  setupHeroInteraction(letters);

  return function heroIn() {
    gsap.timeline()
      .fromTo(ring, { autoAlpha: 0, scale: 1.5 }, { autoAlpha: 1, scale: 1, duration: 1.6, ease: 'power3.out' })
      .fromTo(
        letters,
        // Entrance uses yPercent/scale only, so it never fights the scroll scatter's x/y/z/rotation
        { autoAlpha: 0, yPercent: 50, scale: 0.6 },
        { autoAlpha: 1, yPercent: 0, scale: 1, duration: 1, stagger: 0.08, ease: 'back.out(1.6)' },
        0.2,
      )
      .fromTo(rest, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, 0.6);
  };
}

// Drag (or swipe sideways) to spin the ring; the letters lean toward the cursor.
function setupHeroInteraction(letters) {
  const hero = document.querySelector('.hero');

  // Lean lives on an inner span so it never touches the scroll-scatter transform on each letter
  const leans = letters.map((l) => {
    const inner = document.createElement('span');
    inner.className = 'l__lean';
    inner.append(...l.childNodes);
    l.append(inner);
    return {
      l,
      ry: gsap.quickTo(inner, 'rotationY', { duration: 0.6, ease: 'power3.out' }),
      rx: gsap.quickTo(inner, 'rotationX', { duration: 0.6, ease: 'power3.out' }),
    };
  });

  let dragging = false;
  let lastX = 0;
  hero.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    dragging = true;
    lastX = e.clientX;
    hero.classList.add('is-grabbing');
    hero.setPointerCapture(e.pointerId);
  });
  hero.addEventListener('pointermove', (e) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      spinVel = dx * 0.12;
      angle += dx * 0.18;
    }
    if (e.pointerType !== 'mouse') return;
    for (const { l, ry, rx } of leans) {
      const r = l.getBoundingClientRect();
      ry(((e.clientX - (r.left + r.width / 2)) / innerWidth) * 50);
      rx((-(e.clientY - (r.top + r.height / 2)) / innerHeight) * 40);
    }
  });
  const release = () => {
    dragging = false;
    hero.classList.remove('is-grabbing');
  };
  hero.addEventListener('pointerup', release);
  hero.addEventListener('pointercancel', release);
  hero.addEventListener('pointerleave', () => leans.forEach(({ ry, rx }) => (ry(0), rx(0))));
}
