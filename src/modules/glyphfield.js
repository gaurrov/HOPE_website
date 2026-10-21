// Canvas field of code glyphs at different depths. They drift, speed up with scroll,
// and scatter away from the cursor (or a dragging finger), springing back afterwards.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const GLYPHS = ['{', '}', ';', '</>', '=>', '#', '()', '[]', '+', '&&', '//', '!='];

export function glyphField(canvas, { getVelocity = () => 0 } = {}) {
  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  // Monochrome mix: white outlined, solid black and grey glyphs
  const [paper, ink, grey] = ['--paper', '--ink', '--grey'].map((t) => css.getPropertyValue(t).trim());
  const colors = [paper, ink, paper, grey];
  const font = css.getPropertyValue('--font-mono').trim();

  let w = 0;
  let h = 0;
  const pointer = { x: -9999, y: -9999 };
  // One glyph per ~38,000 px² of section: about 14 on a phone, capped at 40 on large screens
  const count = Math.round(Math.min(40, Math.max(12, (canvas.clientWidth * canvas.clientHeight) / 38000)));
  const parts = Array.from({ length: count }, (_, i) => ({
    glyph: GLYPHS[i % GLYPHS.length],
    color: colors[i % 4],
    d: 0.35 + Math.random() * 0.9, // depth: bigger = nearer, faster, bolder
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 0.00012,
    vy: -0.00006 - Math.random() * 0.00008,
    ox: 0,
    oy: 0,
    vox: 0,
    voy: 0,
    rot: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.01,
  }));
  parts.sort((a, b) => a.d - b.d); // far ones first so near ones paint on top

  function resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(_t, dt) {
    const step = Math.min(dt, 50);
    const scroll = getVelocity();
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = ink;
    ctx.lineJoin = 'round';

    for (const p of parts) {
      // Drift, plus a push from scrolling (nearer glyphs move more: parallax)
      p.x = (p.x + p.vx * step + 1) % 1;
      p.y = (p.y + p.vy * step - (scroll * p.d * 0.00004) * step + 1) % 1;
      p.rot += p.spin * step * 0.06 + scroll * 0.0008 * p.d;

      const bx = p.x * w;
      const by = p.y * h;
      // Cursor repulsion on a spring
      const dx = bx + p.ox - pointer.x;
      const dy = by + p.oy - pointer.y;
      const dist = Math.hypot(dx, dy);
      const reach = 170 * p.d;
      if (dist < reach && dist > 0.01) {
        const force = ((reach - dist) / reach) * 1.6 * p.d;
        p.vox += (dx / dist) * force;
        p.voy += (dy / dist) * force;
      }
      p.vox += -p.ox * 0.02;
      p.voy += -p.oy * 0.02;
      p.vox *= 0.88;
      p.voy *= 0.88;
      p.ox += p.vox;
      p.oy += p.voy;

      const size = (w < 600 ? 12 + 22 * p.d : 16 + 34 * p.d);
      ctx.save();
      ctx.translate(bx + p.ox, by + p.oy);
      ctx.rotate(Math.sin(p.rot) * 0.5);
      ctx.globalAlpha = 0.2 + 0.5 * Math.min(1, p.d);
      ctx.font = `800 ${size}px ${font}`;
      ctx.fillStyle = p.color;
      ctx.lineWidth = Math.max(1, size * 0.07);
      ctx.strokeText(p.glyph, 0, 0);
      ctx.fillText(p.glyph, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  const host = canvas.parentElement;
  const move = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  };
  const leave = () => {
    pointer.x = pointer.y = -9999;
  };
  host.addEventListener('pointermove', move, { passive: true });
  host.addEventListener('pointerdown', move, { passive: true });
  host.addEventListener('pointerleave', leave);

  resize();
  addEventListener('resize', resize);

  let running = false;
  const run = (on) => {
    if (on === running) return;
    running = on;
    on ? gsap.ticker.add(draw) : gsap.ticker.remove(draw);
  };
  ScrollTrigger.create({ trigger: host, start: 'top bottom', end: 'bottom top', onToggle: (self) => run(self.isActive) });
}
