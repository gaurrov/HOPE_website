import gsap from 'gsap';
import { gallerySlots } from '../photos.js';
import { makeFrame, letterFill } from '../frames.js';

const intro = document.getElementById('intro');

// The glitch doubles as the loading screen: at least MIN, until the page has loaded, never past MAX
const GLITCH_MIN = 3000;
const GLITCH_MAX = 5000;
// Code characters each letter flickers into
const SCRAMBLE = { H: ['#', '4', '}'], O: ['0', '@', '*'], P: ['?', '9', '>'], E: ['3', '=', '&'] };

const pageLoaded = new Promise((resolve) => {
  if (document.readyState === 'complete') resolve();
  else addEventListener('load', resolve, { once: true });
});

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

// Glitch the wordmark until the page and its data are ready: colour-split slices, jitter and letter scrambles.
function glitch(mark, ready) {
  const r = gsap.utils.random;
  const letters = [...mark.querySelectorAll('.l')];
  // A full-colour copy whose sliced band tears sideways, then two colour-split ghosts
  const tear = document.createElement('div');
  tear.className = 'glitch-layer glitch-layer--tear';
  tear.innerHTML = mark.innerHTML;
  const ghosts = ['h', 'e'].map((tone) => {
    const layer = document.createElement('div');
    layer.className = `glitch-layer glitch-layer--${tone}`;
    layer.textContent = 'HOPE';
    return layer;
  });
  const layers = [tear, ...ghosts];
  mark.append(...layers);

  let loaded = false;
  Promise.all([pageLoaded, ready]).then(() => (loaded = true));

  return new Promise((resolve) => {
    const start = performance.now();

    const step = () => {
      const t = performance.now() - start;
      if ((t >= GLITCH_MIN && loaded) || t >= GLITCH_MAX) {
        layers.forEach((l) => l.remove());
        letters.forEach((l) => (l.textContent = l.dataset.char));
        mark.style.transform = '';
        resolve();
        return;
      }

      // Calm, broken by bursts, settling slightly towards the end
      const burst = Math.random() < 0.35;
      const energy = (burst ? 1 : 0.4) * (1 - (t / GLITCH_MAX) * 0.35);

      layers.forEach((layer, i) => {
        if (Math.random() < energy) {
          const top = r(0, 85);
          const height = i === 0 ? r(4, 18) : r(10, 45);
          const shift = i === 0 ? r(0.08, 0.3) * (Math.random() < 0.5 ? -1 : 1) : r(-0.18, 0.18);
          layer.style.clipPath = `inset(${top}% 0 ${Math.max(0, 100 - top - height)}% 0)`;
          layer.style.transform = `translateX(${shift * energy}em)`;
        } else {
          layer.style.clipPath = 'inset(50% 0 50% 0)';
        }
      });

      mark.style.transform =
        Math.random() < energy * 0.6
          ? `translate(${r(-8, 8) * energy}px, ${r(-3, 3)}px) skewX(${r(-10, 10) * energy}deg)`
          : '';

      if (Math.random() < energy * 0.45) {
        const l = letters[Math.floor(Math.random() * letters.length)];
        const options = SCRAMBLE[l.dataset.char];
        l.textContent = options[Math.floor(Math.random() * options.length)];
        setTimeout(() => (l.textContent = l.dataset.char), r(50, 140));
      }

      setTimeout(step, r(40, burst ? 70 : 140));
    };

    step();
  });
}

// ready: resolves with the hero entrance function once the page content is built
export async function runIntro({ ready, onDone }) {
  const mark = intro.querySelector('.intro__mark');
  const letters = mark.querySelectorAll('.l');
  const paper = intro.querySelector('.intro__paper');
  const bar = intro.querySelector('.intro__load span');
  letters.forEach((l) => (l.dataset.char = l.textContent));

  intro.classList.add('is-live');
  const loading = gsap.to(bar, { scaleX: 0.85, duration: GLITCH_MIN / 1000, ease: 'power1.out' });
  await glitch(mark, ready.catch(() => null));
  loading.kill();
  const onReveal = await ready;

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

  tl.to(bar, { scaleX: 1, duration: 0.2, ease: 'power1.out' })
    // 1. glitch locks: hold the clean mark for a beat
    .to(['.intro__expand', '.intro__load'], { autoAlpha: 0, y: 12, duration: 0.3, ease: 'power2.in' }, '+=0.25')
    // 2. letters become windows onto the photos
    .to(letters, { color: 'rgba(0,0,0,0)', duration: 0.5, stagger: 0.06, ease: 'power2.out' }, '-=0.1')
    // 3. the page goes dark and the tunnel appears behind the letters
    .to(paper, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut' }, '+=0.05')
    // 4. fly through the O while the photos rush past
    .addLabel('fly', '<0.15')
    .to(mark, { scale: zoom, duration: 1.3, ease: 'power3.in' }, 'fly')
    .fromTo(track, { z: 0 }, { z: depth, duration: 2.6, ease: 'power2.inOut' }, 'fly-=0.2')
    .to(mark, { autoAlpha: 0, duration: 0.2 }, 'fly+=1.15')
    // 5. land on the hero
    .add(() => onReveal?.(), 'fly+=1.7')
    .to(intro, { autoAlpha: 0, duration: 0.6, ease: 'power1.out' }, 'fly+=1.8');

  if (import.meta.env.DEV) window.__introTl = tl;
  return tl;
}
