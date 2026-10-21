import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

// Text rises from a mask, scrubbed to scroll. reference.md §2.6 rule 3
export function setupReveals() {
  document.querySelectorAll('.split-lines').forEach((el) => {
    const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    gsap.from(split.lines, {
      yPercent: 100,
      stagger: 0.15,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 60%', scrub: 1 },
    });
  });
}

// Code glyphs drop and bounce onto the statement.
export function setupStatement() {
  const section = document.querySelector('.statement');
  const glyphs = section.querySelectorAll('.glyph');
  // Resting place and angle come from each glyph's inline style (shared with lite mode)
  const restAngle = (i) => parseFloat(glyphs[i].style.getPropertyValue('--r')) || 0;

  gsap.fromTo(
    glyphs,
    { y: () => -section.offsetHeight, rotation: (i) => (i % 2 ? 140 : -120) },
    {
      y: 0,
      rotation: restAngle,
      duration: (i) => 1.2 + (i % 3) * 0.25,
      stagger: { each: 0.09, from: 'random' },
      ease: 'bounce.out',
      scrollTrigger: { trigger: section, start: 'top 35%', toggleActions: 'play none none reverse' },
    },
  );
}

// Pinned horizontal strip of track cards.
export function setupTracks() {
  const section = document.querySelector('.tracks');
  const strip = section.querySelector('.tracks__strip');
  const distance = () => strip.scrollWidth - innerWidth;

  const title = SplitText.create('.tracks__title', { type: 'chars', mask: 'chars' });
  gsap.from(title.chars, {
    yPercent: 100,
    stagger: 0.03,
    ease: 'power3.out',
    scrollTrigger: { trigger: section, start: 'top 80%', end: 'top 10%', scrub: 1 },
  });

  const move = gsap.to(strip, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      pin: true,
      start: 'top top',
      end: () => `+=${distance()}`,
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });

  // Photos drift inside their cards as the strip moves
  section.querySelectorAll('.track > .frame').forEach((frame) => {
    gsap.fromTo(
      frame,
      { xPercent: -6 },
      {
        xPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: frame.parentElement, containerAnimation: move, start: 'left right', end: 'right left', scrub: true },
      },
    );
  });
}

// The lab: sketch fills with colour, heading swaps, batch details rise in.
export function setupVenue() {
  const section = document.querySelector('.venue');

  gsap.fromTo(
    '.venue__pin',
    { clipPath: 'inset(10% 8% 10% 8% round 32px)' },
    {
      clipPath: 'inset(0% 0% 0% 0% round 0px)',
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top bottom', end: 'top top', scrub: true },
    },
  );

  gsap.set('.venue__h--b', { yPercent: 110 });
  gsap.set('.venue__info', { y: 40 });

  gsap.timeline({
    scrollTrigger: { trigger: section, pin: true, start: 'top top', end: '+=220%', scrub: 1 },
  })
    .fromTo('.venue__media', { scale: 1.08 }, { scale: 1, ease: 'none', duration: 2 }, 0)
    .to('.venue__img--color', { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power1.inOut', duration: 1 }, 0.1)
    .to('.venue__h--a', { yPercent: -110, duration: 0.35, ease: 'power2.in' }, 0.85)
    .to('.venue__h--b', { yPercent: 0, duration: 0.35, ease: 'power2.out' }, 1.05)
    .to('.venue__shade', { opacity: 1, duration: 0.4 }, 1.1)
    .to('.venue__info', { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 1.25)
    .to({}, { duration: 0.4 });
}

// Heading crosses the screen while glyphs drift; then the split's diagonal settles.
export function setupPaths() {
  const heading = document.querySelector('.paths__heading');
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.paths',
      pin: true,
      start: 'top top',
      end: '+=250%',
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });
  tl.fromTo(heading, { x: () => innerWidth }, { x: () => -heading.offsetWidth, ease: 'none' }, 0);
  document.querySelectorAll('.paths .glyph--float').forEach((g, i) => {
    tl.to(g, { y: (i % 2 ? 1 : -1) * 220, rotation: `+=${i % 2 ? 120 : -90}`, ease: 'none' }, 0);
  });

  gsap.matchMedia().add('(min-width: 721px)', () => {
    gsap.fromTo(
      '.split',
      { '--cut-top': '78%', '--cut-bot': '58%' },
      {
        '--cut-top': '60%',
        '--cut-bot': '40%',
        ease: 'none',
        scrollTrigger: { trigger: '.split', start: 'top bottom', end: 'top top', scrub: true },
      },
    );
  });
}
