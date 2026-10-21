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
import { getSiteMedia, getMentors, getEvents, getCompanies, getBatches, getBatchStats, getFeatured, getTeam } from './lib/data.js';
import { el, emptyState, mentorCard, placementCard, teamCard } from './lib/render.js';
import { runIntro, removeIntro } from './modules/intro.js';
import { buildRing, setupHero } from './modules/hero.js';
import { setupReveals, setupStatement, setupTracks, setupVenue, setupPaths, setupMentors, setupEvents, setupPlacements } from './modules/scenes.js';
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
    grid.replaceWith(emptyState('The mentors assigned by the college will be listed here.'));
    return;
  }
  mentors.forEach((m, i) => grid.append(mentorCard(m, i)));
}

// The diagonal split shows the first two batches with live counts
function renderBatches(batches, stats) {
  const panels = document.querySelectorAll('.split__panel');
  panels.forEach((panel, i) => {
    const b = batches[i];
    if (!b) return panel.remove();
    const st = stats[b.id] || { students: 0, placed: 0 };
    panel.querySelector('.split__name').textContent = b.name;
    panel.querySelector('.split__desc').textContent = b.description || 'Selected by the college and trained together, week after week, in the lab.';
    panel.querySelector('.split__meta').textContent = st.students
      ? `${st.students} ${st.students === 1 ? 'student' : 'students'}${st.placed ? `, ${st.placed} placed or working` : ''}`
      : 'Students will be listed soon.';
    const link = panel.querySelector('.split__link');
    link.href = `/batches/?b=${b.slug}`;
    link.querySelector('span').textContent = `See ${b.name}`;
  });
  // The lab note names whichever batches exist
  const note = document.querySelector('.venue__note');
  if (note && batches.length) {
    const names = batches.map((b) => b.name);
    note.textContent = `${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]} train here every week.`;
  }
}

function renderPlacements(featured) {
  const wall = document.querySelector('.placements__wall');
  if (!featured.length) {
    wall.replaceWith(emptyState('Top placements will be shown here as HOPE students receive their offers.'));
    return;
  }
  featured.forEach((s, i) => wall.append(placementCard(s, i)));
}

function renderTeam(team) {
  const grid = document.querySelector('.team__grid');
  if (!team.length) {
    grid.replaceWith(emptyState('The HOPE coordinators will be introduced here.'));
    return;
  }
  team.forEach((a, i) => grid.append(teamCard(a, i)));
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
  const [media, mentors, events, companies, batches, stats, featured, team] = await Promise.all([
    withTimeout(getSiteMedia(), {}),
    withTimeout(getMentors(), []),
    withTimeout(getEvents(), []),
    withTimeout(getCompanies(), []),
    withTimeout(getBatches(), []),
    withTimeout(getBatchStats(), {}),
    withTimeout(getFeatured(), []),
    withTimeout(getTeam(), []),
  ]);
  setSiteMedia(media);
  renderBatches(batches, stats);
  renderPlacements(featured);
  renderTeam(team);
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
    setupPlacements();
    // Interactive layer: glyph field behind events, glyphs dodge the cursor, cards tilt, terminal
    glyphField(document.querySelector('.events__field'), { getVelocity: () => lenis.velocity });
    cursorGlyphs('.statement__glyphs .glyph, .paths .glyph--float');
    tiltAll('.mentor, .member');
    tiltAll('.placement', { max: 12, lift: 50 });
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
