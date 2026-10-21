import gsap from 'gsap';
import { gallerySlots } from '../photos.js';
import { makeFrame, letterFill } from '../frames.js';

const intro = document.getElementById('intro');

// Resolves with 'full' or 'lite' depending on which intro button was pressed.
export function waitForGate() {
  const enter = intro.querySelector('.intro__enter');
  const lite = intro.querySelector('.intro__lite');
  enter.focus({ preventScroll: true });
  return new Promise((resolve) => {
    enter.addEventListener('click', () => resolve('full'), { once: true });
    lite.addEventListener('click', () => resolve('lite'), { once: true });
  });
}

export function removeIntro() {
  intro.remove();
}

function buildTunnel() {
  const track = intro.querySelector('.tunnel__track');
  const vw = innerWidth;
  const vh = innerHeight;
  const count = 14;
  const spacing = 650;
  for (let i = 0; i < count; i++) {
    const el = makeFrame(gallerySlots[i % gallerySlots.length], i, 'tunnel__item');
    // Golden-angle spiral keeps frames spread around the centre without overlapping the path
    const a = i * 2.39996;
    const r = (0.22 + (i % 3) * 0.1) * vw;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * (vh / vw) * 1.1;
    const z = -400 - i * spacing;
    el.style.setProperty('--tw', `${22 + (i % 4) * 4}vw`);
    el.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;
    track.append(el);
  }
  return { track, depth: 400 + count * spacing + 900 };
}

// Point the zoom at the middle of the O's counter so the camera flies through the hole.
// Returns the scale at which the counter covers the whole viewport.
function aimAtO(mark) {
  const o = mark.querySelector('.l-o');
  const rm = mark.getBoundingClientRect();
  const ro = o.getBoundingClientRect();
  const cx = ro.left + ro.width / 2;
  const cy = ro.top + ro.height * 0.5;
  mark.style.transformOrigin = `${cx - rm.left}px ${cy - rm.top}px`;
  // The counter is roughly 40% of the glyph box wide; it must reach the farthest viewport corner
  const reach = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
  return (reach * 1.15) / (ro.width * 0.2);
}

export function runIntro({ onReveal, onDone }) {
  const mark = intro.querySelector('.intro__mark');
  const letters = mark.querySelectorAll('.l');
  const paper = intro.querySelector('.intro__paper');
  const { track, depth } = buildTunnel();

  letters.forEach((l, i) => {
    l.style.backgroundImage = letterFill(gallerySlots[i * 3], i);
  });
  const zoom = aimAtO(mark);

  const tl = gsap.timeline({
    paused: new URLSearchParams(location.search).has('debug-intro'),
    onComplete() {
      removeIntro();
      onDone?.();
    },
  });

  tl.to(['.intro__expand', '.intro__actions'], { autoAlpha: 0, y: 16, duration: 0.35, ease: 'power2.in' })
    // 1. letters become windows onto the photos
    .to(letters, { color: 'rgba(0,0,0,0)', duration: 0.55, stagger: 0.07, ease: 'power2.out' }, '-=0.05')
    // 2. the page goes dark and the tunnel appears behind the letters
    .to(paper, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut' }, '+=0.1')
    // 3. fly through the O while the photos rush past
    .addLabel('fly', '<0.15')
    .to(mark, { scale: zoom, duration: 1.3, ease: 'power3.in' }, 'fly')
    .fromTo(track, { z: 0 }, { z: depth, duration: 2.6, ease: 'power2.inOut' }, 'fly-=0.2')
    .to(mark, { autoAlpha: 0, duration: 0.2 }, 'fly+=1.15')
    // 4. land on the hero
    .add(() => onReveal?.(), 'fly+=1.7')
    .to(intro, { autoAlpha: 0, duration: 0.6, ease: 'power1.out' }, 'fly+=1.8');

  if (import.meta.env.DEV) window.__introTl = tl;
  return tl;
}
