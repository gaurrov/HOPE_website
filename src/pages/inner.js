// Shared setup for inner pages (batches, alumni): styles, smooth scroll, menu, title reveal.
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import '../styles/sections.css';
import '../styles/pages.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { setupChrome } from '../modules/chrome.js';
import { cursorGlyphs } from '../modules/interact.js';
import { setupTerminal } from '../modules/terminal.js';
import { formatDate } from '../lib/data.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

export const isLite = () => document.documentElement.classList.contains('lite');

export async function initInner() {
  await document.fonts.ready;
  let lenis = null;
  if (!isLite()) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1.2 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);

    const title = SplitText.create('.page__title', { type: 'chars', mask: 'chars' });
    gsap.from(title.chars, { yPercent: 100, rotation: 10, stagger: 0.05, duration: 0.9, ease: 'power3.out' });
    gsap.from('.page__lead, .chips', { y: 24, autoAlpha: 0, stagger: 0.1, duration: 0.8, delay: 0.3, ease: 'power3.out' });
    // Header glyphs drift away as the page scrolls
    gsap.utils.toArray('.page__glyphs .glyph').forEach((g, i) => {
      gsap.to(g, { y: -180 - i * 80, rotation: i % 2 ? 60 : -45, ease: 'none', scrollTrigger: { start: 0, end: innerHeight, scrub: true } });
    });
  }
  setupTerminal({ go: setupChrome(lenis) });
  cursorGlyphs('.page__glyphs .glyph');
  return lenis;
}

// Chip row; returns a function to mark the active chip
export function renderChips(box, items, onPick) {
  const buttons = items.map((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = item.label;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => onPick(item.value));
    return b;
  });
  box.replaceChildren(...buttons);
  return (value) => buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(items[i].value === value)));
}

// Large link card for one batch: name, dates, description, counts, and a giant outlined word behind them.
// Used on /batches/ and in "Other batches" on each batch page.
export function batchCard(batch, stats = { students: 0, placed: 0 }, i = 0) {
  const a = document.createElement('a');
  a.className = 'bcard';
  a.href = `/batches/${batch.slug}/`;
  const add = (tag, cls, text) => {
    const n = document.createElement(tag);
    n.className = cls;
    if (text) n.textContent = text;
    a.append(n);
    return n;
  };
  add('span', 'bcard__word', batch.name.replace(/^HOPE\s+/i, '')).setAttribute('aria-hidden', 'true');
  add('h2', 'bcard__name', batch.name);
  const when = [formatDate(batch.starts_on), formatDate(batch.ends_on)].filter(Boolean).join(' to ');
  if (when) add('p', 'bcard__dates', when);
  if (batch.description) add('p', 'bcard__desc', batch.description);
  add(
    'p',
    'bcard__meta',
    stats?.students
      ? `${stats.students} ${stats.students === 1 ? 'student' : 'students'}${stats.placed ? `, ${stats.placed} placed or working` : ''}`
      : 'Students will be listed soon.',
  );
  add('span', 'bcard__go', `Open ${batch.name}`);
  a.style.setProperty('--i', i);
  return a;
}
