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

// Photo corridor for the fly-through (modelled on the DevFest Chennai entrance):
// photos line the left and right walls of a corridor, turned to face the centre line,
// and the camera flies forward at a steady pace. Each photo appears as a small thumbnail
// near the vanishing point, grows as it approaches, and slides off to its own side as it
// passes, so photos never stack on top of each other.
const TUNNEL_PHOTOS = 10;
const PERSPECTIVE = 900; // must match .tunnel { perspective } in sections.css
const SPACING = 1050; // depth between consecutive photos (px)
const FIRST_Z = -1500; // where the first photo starts, already visible but small
const FADE_FAR = -5200; // photos further than this are invisible...
const FADE_NEAR = -4100; // ...and fully visible from here on (the "pop up")
const EXIT_Z = 700; // past this they are behind the camera: hide them
const FLIGHT = 4.4; // seconds for the whole corridor

function buildTunnel() {
  const track = intro.querySelector('.tunnel__track');
  const vw = innerWidth;
  const vh = innerHeight;
  const narrow = vw < 720;
  const w = vw * (narrow ? 0.7 : 0.4);
  const rise = [-0.05, 0.07, -0.01, 0.04, -0.07, 0.02]; // gentle up/down so the walls don't look ruled
  const photos = Array.from({ length: TUNNEL_PHOTOS }, (_, i) => {
    const el = makeFrame(gallerySlots[i % gallerySlots.length], i, 'tunnel__item');
    const side = i % 2 ? 1 : -1;
    el.style.setProperty('--tw', `${w}px`);
    track.append(el);
    return {
      el,
      z: FIRST_Z - i * SPACING,
      // inner edge sits just off the centre line, so the photo opens outward as it nears
      x: side * (w / 2 + vw * (narrow ? 0.02 : 0.03)),
      y: vh * rise[i % rise.length],
      rot: -side * 18, // turned to face the centre, like a corridor wall
    };
  });

  const travel = -(FIRST_Z - (TUNNEL_PHOTOS - 1) * SPACING) + EXIT_Z;
  const cam = { z: 0 };
  const place = () => {
    for (const p of photos) {
      const z = p.z + cam.z;
      if (z < FADE_FAR || z > EXIT_Z) {
        p.el.style.visibility = 'hidden';
        continue;
      }
      const t = Math.min(1, (z - FADE_FAR) / (FADE_NEAR - FADE_FAR));
      const pop = 0.55 + 0.45 * (1 - (1 - t) ** 3); // grows into place as it fades in
      p.el.style.visibility = 'visible';
      p.el.style.opacity = String(t);
      p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, ${z}px) rotateY(${p.rot}deg) scale(${pop})`;
    }
  };
  place();
  return { cam, travel, place };
}

// White speed lines streaking out from the vanishing point; `speed` (0 to 1) is driven by the timeline.
function speedLines(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio, 2);
  const w = (canvas.width = innerWidth * dpr) / dpr;
  const h = (canvas.height = innerHeight * dpr) / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.hypot(cx, cy);
  const lines = Array.from({ length: w < 720 ? 90 : 170 }, () => ({
    a: Math.random() * Math.PI * 2,
    r: Math.random() * maxR,
    v: 0.6 + Math.random() * 0.9,
    lw: 0.6 + Math.random() * 1.6,
  }));
  const state = { speed: 0 };

  const draw = (_t, dt) => {
    ctx.clearRect(0, 0, w, h);
    if (state.speed < 0.01) return;
    const step = Math.min(dt, 40) / 16;
    for (const l of lines) {
      l.r += (6 + 70 * state.speed) * l.v * step * (0.3 + l.r / maxR);
      if (l.r > maxR) {
        l.r = 10 + Math.random() * 60;
        l.a = Math.random() * Math.PI * 2;
      }
      const depth = l.r / maxR; // lines lengthen and brighten as they near the edge
      const len = (10 + 320 * state.speed) * l.v * (0.2 + depth);
      const cos = Math.cos(l.a);
      const sin = Math.sin(l.a);
      const x1 = cx + cos * l.r;
      const y1 = cy + sin * l.r;
      const x2 = cx + cos * (l.r + len);
      const y2 = cy + sin * (l.r + len);
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, `rgba(255,255,255,${Math.min(0.9, 0.85 * state.speed * (0.3 + depth))})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = l.lw * (0.5 + depth);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  };
  gsap.ticker.add(draw);
  return { state, stop: () => gsap.ticker.remove(draw) };
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

  const corridor = buildTunnel();
  const lines = speedLines(intro.querySelector('.intro__speed'));
  letters.forEach((l, i) => {
    l.style.backgroundImage = letterFill(gallerySlots[i * 3], i);
  });
  const zoom = aimAtO(mark);

  const tl = gsap.timeline({
    paused: new URLSearchParams(location.search).has('debug-intro'),
    onComplete() {
      lines.stop();
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
    // 4. fly through the O; speed lines start streaking as the camera picks up pace
    .addLabel('fly', '<0.15')
    .to(mark, { scale: zoom, duration: 1.3, ease: 'power3.in' }, 'fly')
    .to(lines.state, { speed: 0.35, duration: 0.7, ease: 'power1.in' }, 'fly')
    .to(mark, { autoAlpha: 0, duration: 0.2 }, 'fly+=1.15')
    .addLabel('photos', 'fly+=0.75')
    .to(lines.state, { speed: 1, duration: 0.6, ease: 'power2.out' }, 'photos')
    // 5. the camera flies down the corridor; photos pop in ahead and peel off to the sides
    .to(corridor.cam, { z: corridor.travel, duration: FLIGHT, ease: 'power1.inOut', onUpdate: corridor.place }, 'fly');

  // 6. slow down and land on the hero
  const tunnelEnd = FLIGHT; // seconds after 'fly'
  tl.to(lines.state, { speed: 0, duration: 0.9, ease: 'power2.inOut' }, `fly+=${tunnelEnd - 0.8}`)
    .add(() => onReveal?.(), `fly+=${tunnelEnd - 0.6}`)
    .to(intro, { autoAlpha: 0, duration: 0.6, ease: 'power1.out' }, `fly+=${tunnelEnd - 0.4}`);

  if (import.meta.env.DEV) window.__introTl = tl;
  return tl;
}
