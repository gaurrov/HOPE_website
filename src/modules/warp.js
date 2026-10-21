import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const GLYPHS = ['{', '}', ';', '</>', '=>', '#', '()', '[]', '+', '&&', '//', '!='];
const TOKENS = ['--h', '--o', '--p', '--e'];

// Starfield of code glyphs streaming outward. Speed follows scroll progress.
export function setupWarp() {
  const canvas = document.querySelector('.warp__canvas');
  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const colors = TOKENS.map((t) => css.getPropertyValue(t).trim());
  const ink = css.getPropertyValue('--ink').trim();
  const font = css.getPropertyValue('--font-mono').trim();

  const FAR = 1600;
  const stars = Array.from({ length: 150 }, (_, i) => spawn({ glyph: GLYPHS[i % GLYPHS.length], color: colors[i % 4] }, true));
  let w = 0;
  let h = 0;
  let progress = 0;

  function spawn(s, anywhere) {
    s.x = (Math.random() - 0.5) * 2400;
    s.y = (Math.random() - 0.5) * 1600;
    s.z = anywhere ? Math.random() * FAR : FAR;
    return s;
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    const speed = 4 + progress * 38;
    const f = Math.min(w, h) * 0.9;
    ctx.fillStyle = ink;
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const s of stars) {
      s.z -= speed;
      if (s.z < 20) spawn(s, false);
      const k = f / s.z;
      const x = w / 2 + s.x * k;
      const y = h / 2 + s.y * k;
      if (x < -80 || x > w + 80 || y < -80 || y > h + 80) {
        spawn(s, false);
        continue;
      }
      const size = Math.min(54 * k, 110);
      ctx.globalAlpha = Math.min(1, (FAR - s.z) / 500);
      ctx.fillStyle = s.color;
      ctx.font = `800 ${size}px ${font}`;
      ctx.fillText(s.glyph, x, y);
    }
    ctx.globalAlpha = 1;
  }

  resize();
  addEventListener('resize', resize);

  let running = false;
  const run = (on) => {
    if (on === running) return;
    running = on;
    on ? gsap.ticker.add(draw) : gsap.ticker.remove(draw);
  };

  ScrollTrigger.create({
    trigger: '.warp',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => run(self.isActive),
    onUpdate: (self) => (progress = self.progress),
  });
}
