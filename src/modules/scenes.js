import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

const depthOf = (el) => parseFloat(el.style.getPropertyValue('--d')) || 1;

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

// Words flip up out of their lines; code glyphs drift past at different depths.
export function setupStatement() {
  const section = document.querySelector('.statement');

  const split = SplitText.create('.statement__text', { type: 'lines,words', mask: 'lines', linesClass: 'split-line' });
  gsap.from(split.words, {
    yPercent: 110,
    rotationX: -80,
    transformOrigin: '50% 100%',
    stagger: 0.06,
    ease: 'power3.out',
    scrollTrigger: { trigger: section, start: 'top 70%', end: 'center 50%', scrub: 1 },
  });

  // Nearer glyphs (bigger --d) travel further and spin more: parallax depth
  section.querySelectorAll('.glyph').forEach((g, i) => {
    const d = depthOf(g);
    const dir = i % 2 ? 1 : -1;
    gsap.fromTo(
      g,
      { y: d * 320, rotation: dir * -40 * d },
      {
        y: d * -320,
        rotation: dir * 60 * d,
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });
}

// Pinned horizontal strip; cards swing round a curve like the hero ring as they pass.
export function setupTracks() {
  const section = document.querySelector('.tracks');
  const strip = section.querySelector('.tracks__strip');
  const distance = () => strip.scrollWidth - innerWidth;

  const title = SplitText.create('.tracks__title', { type: 'chars', mask: 'chars' });
  gsap.from(title.chars, {
    yPercent: 100,
    rotation: 12,
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

  section.querySelectorAll('.track').forEach((card) => {
    const along = { trigger: card, containerAnimation: move, start: 'left right', end: 'right left', scrub: true };
    // Enter from the right turned towards the centre, face the viewer mid-screen, leave turned away
    gsap.timeline({ scrollTrigger: along })
      .fromTo(card, { rotationY: -38, z: -260 }, { rotationY: 0, z: 0, ease: 'power1.out' })
      .to(card, { rotationY: 38, z: -260, ease: 'power1.in' });
    // Photo drifts inside its card
    gsap.fromTo(card.querySelector('.frame'), { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: along });
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

// Heading rides across the screen on a wave while glyphs drift; then the split closes in.
export function setupPaths() {
  const heading = document.querySelector('.paths__heading');
  const { chars } = SplitText.create(heading, { type: 'chars', charsClass: 'char' });
  const setY = chars.map((c) => gsap.quickSetter(c, 'y', 'px'));
  const setR = chars.map((c) => gsap.quickSetter(c, 'rotation', 'deg'));
  let amp = 0;
  const measure = () => (amp = parseFloat(getComputedStyle(heading).fontSize) * 0.16);
  measure();
  addEventListener('resize', measure);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.paths',
      pin: true,
      start: 'top top',
      end: '+=250%',
      scrub: 1,
      invalidateOnRefresh: true,
    },
    onUpdate() {
      const phase = tl.progress() * 18;
      chars.forEach((_, i) => {
        setY[i](Math.sin(i * 0.45 - phase) * amp);
        setR[i](Math.cos(i * 0.45 - phase) * 6);
      });
    },
  });
  // Ends with the last words still on screen so the split rises over them, not over a blank page
  tl.fromTo(heading, { x: () => innerWidth }, { x: () => innerWidth * 0.55 - heading.offsetWidth, ease: 'none' }, 0);
  document.querySelectorAll('.paths .glyph--float').forEach((g, i) => {
    tl.to(g, { y: (i % 2 ? 1 : -1) * 240, rotation: `+=${i % 2 ? 140 : -110}`, ease: 'none' }, 0);
  });

  gsap.matchMedia().add('(min-width: 721px)', () => {
    const enter = { trigger: '.split', start: 'top bottom', end: 'top top', scrub: true };
    gsap.timeline({ scrollTrigger: enter })
      .fromTo('.split', { '--cut-top': '78%', '--cut-bot': '58%' }, { '--cut-top': '60%', '--cut-bot': '40%', ease: 'none' }, 0)
      .fromTo('.split__panel--a .frame', { xPercent: -14 }, { xPercent: 0, ease: 'none' }, 0)
      .fromTo('.split__panel--b .frame', { xPercent: 14 }, { xPercent: 0, ease: 'none' }, 0)
      .from('.split__body', { y: 80, autoAlpha: 0, stagger: 0.15, ease: 'power2.out' }, 0.35);
  });
}

// Mentor cards are dealt in as the grid arrives.
export function setupMentors() {
  gsap.from('.mentor', {
    y: 140,
    rotation: (i) => [-6, 0, 6][i % 3],
    autoAlpha: 0,
    stagger: 0.12,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.mentors__grid', start: 'top 92%', end: 'top 30%', scrub: 1 },
  });
}

// Events: title letters rise, the deck slides in from the right as the section arrives.
export function setupEvents() {
  const title = SplitText.create('.events__title', { type: 'chars', mask: 'chars' });
  const enter = { trigger: '.events', start: 'top 85%', end: 'top 25%', scrub: 1 };
  gsap.from(title.chars, { yPercent: 100, rotation: 10, stagger: 0.04, ease: 'power3.out', scrollTrigger: enter });
  gsap.from('.events__tabs, .events__next', { y: 30, autoAlpha: 0, stagger: 0.1, ease: 'power2.out', scrollTrigger: enter });
  gsap.from('.deck__track', { x: () => innerWidth * 0.5, rotationY: -20, ease: 'power3.out', scrollTrigger: enter });
}
