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
import { fillAllFrames } from '../frames.js';
import { cursorGlyphs, tilt } from '../modules/interact.js';
import { setupTerminal } from '../modules/terminal.js';

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

// Put cards into a grid; in full mode they are dealt in like the mentor cards on the home page
export function showCards(grid, cards) {
  grid.replaceChildren(...cards);
  fillAllFrames(grid);
  grid.querySelectorAll('.person').forEach((card) => tilt(card));
  if (isLite() || !cards.length) return;
  gsap.from(cards, {
    y: 80,
    rotation: (i) => [-4, 0, 4][i % 3],
    autoAlpha: 0,
    duration: 0.8,
    stagger: 0.06,
    ease: 'power3.out',
  });
  ScrollTrigger.refresh();
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
