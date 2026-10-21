import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/sections.css';
import './styles/pages.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

import { fillAllFrames, setSiteMedia } from './frames.js';
import { getSiteMedia, getMentors, getEvents, getCompanies } from './lib/data.js';
import { el, emptyState, mentorCard } from './lib/render.js';
import { runIntro, removeIntro } from './modules/intro.js';
import { buildRing, setupHero } from './modules/hero.js';
import { setupReveals, setupStatement, setupTracks, setupVenue, setupPaths, setupMentors, setupEvents } from './modules/scenes.js';
import { setupEventDeck } from './modules/events.js';
import { glyphField } from './modules/glyphfield.js';
import { cursorGlyphs, tiltAll } from './modules/interact.js';
import { setupTerminal } from './modules/terminal.js';
import { setupChrome, setupSecretDoor } from './modules/chrome.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// Never let a slow network hold the page: render with whatever has arrived after 2.5 s
const withTimeout = (promise, fallback) => Promise.race([promise, new Promise((r) => setTimeout(() => r(fallback), 2500))]);

function renderMentors(mentors) {
  const grid = document.querySelector('.mentors__grid');
  if (!mentors.length) {
    grid.replaceWith(emptyState('The mentors for the next batch will be listed here once the college assigns them.'));
    return;
  }
  mentors.forEach((m, i) => grid.append(mentorCard(m, i)));
}

function renderCompanies(companies) {
  if (!companies.length) return;
  const section = document.querySelector('.alumni');
  section.querySelectorAll('.marquee__list').forEach((list) => {
    // Repeat short lists so the strip always fills the screen
    const names = companies.length < 6 ? [...companies, ...companies, ...companies] : companies;
    names.forEach((name) => list.append(el('li', 'company', name)));
  });
  section.hidden = false;
}

// Fetch the content, then build everything that depends on it
async function buildPage() {
  const [media, mentors, events, companies] = await Promise.all([
    withTimeout(getSiteMedia(), {}),
    withTimeout(getMentors(), []),
    withTimeout(getEvents(), []),
    withTimeout(getCompanies(), []),
  ]);
  setSiteMedia(media);
  renderMentors(mentors);
  setupEventDeck(events);
  renderCompanies(companies);
  fillAllFrames();
  buildRing();
  setupSecretDoor();
}

async function startLite() {
  root.classList.replace('full', 'lite');
  removeIntro();
  await buildPage();
  setupTerminal({ go: setupChrome(null) });
}

function startFull() {
  scrollTo(0, 0);
  // Wheel input amplified and eased like the reference (each flick glides further)
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1.2 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();

  // The glitch loader runs while this builds; scroll scenes are measured after content is in place
  const ready = buildPage().then(() => {
    const heroIn = setupHero(lenis);
    setupReveals();
    setupStatement();
    setupTracks();
    setupVenue();
    setupEvents();
    setupPaths();
    setupMentors();
    // Interactive layer: glyph field behind events, glyphs dodge the cursor, cards tilt, terminal
    glyphField(document.querySelector('.events__field'), { getVelocity: () => lenis.velocity });
    cursorGlyphs('.statement__glyphs .glyph, .paths .glyph--float');
    tiltAll('.mentor');
    setupTerminal({ go: setupChrome(lenis) });
    return heroIn;
  });

  runIntro({
    ready,
    onDone() {
      lenis.start();
      ScrollTrigger.refresh();
    },
  });
}

async function boot() {
  await document.fonts.ready;
  if (root.classList.contains('lite')) return startLite();
  startFull();
}

boot();
