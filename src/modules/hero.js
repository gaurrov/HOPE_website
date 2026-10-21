import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { gallerySlots } from '../photos.js';
import { makeFrame } from '../frames.js';

const ring = document.querySelector('.ring');
const spin = document.querySelector('.ring__spin');
const COUNT = 12;
let radius = 0;
let angle = 0;

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

// Full mode: spin the ring (faster while scrolling), hide hero content until the intro lands.
export function setupHero(lenis) {
  const content = ['.hero__mark .l', '.hero__sub', '.hero__ctas', '.hero__down'];
  gsap.set(content, { autoAlpha: 0 });
  gsap.set(ring, { autoAlpha: 0 });

  const tick = (_t, dt) => {
    angle -= dt * 0.006 + Math.abs(lenis.velocity) * 0.04;
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

  gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  })
    .to('.hero__content', { yPercent: -25, autoAlpha: 0, ease: 'none' }, 0)
    .to(ring, { scale: 1.25, ease: 'none' }, 0);

  return function heroIn() {
    gsap.timeline()
      .fromTo(ring, { autoAlpha: 0, scale: 1.5 }, { autoAlpha: 1, scale: 1, duration: 1.6, ease: 'power3.out' })
      .fromTo(
        '.hero__mark .l',
        { autoAlpha: 0, yPercent: 40, rotateX: -60 },
        { autoAlpha: 1, yPercent: 0, rotateX: 0, duration: 1, stagger: 0.08, ease: 'power3.out' },
        0.2,
      )
      .fromTo(
        ['.hero__sub', '.hero__ctas', '.hero__down'],
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' },
        0.6,
      );
  };
}
