import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/sections.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

import { fillAllFrames } from './frames.js';
import { photos } from './photos.js';
import { mentors } from './mentors.js';
import { runIntro, removeIntro } from './modules/intro.js';
import { buildRing, setupHero } from './modules/hero.js';
import { setupReveals, setupStatement, setupTracks, setupVenue, setupPaths, setupMentors } from './modules/scenes.js';
import { setupWarp } from './modules/warp.js';
import { setupChrome } from './modules/chrome.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

renderMentors();
fillAllFrames();
buildRing();

// Mentor cards come from src/mentors.js; their photos join the manifest as mentor-1, mentor-2, ...
function renderMentors() {
  const grid = document.querySelector('.mentors__grid');
  const tones = ['h', 'o', 'p', 'e'];
  mentors.forEach((m, i) => {
    const slot = `mentor-${i + 1}`;
    photos[slot] = m.photo;
    const li = document.createElement('li');
    li.className = 'mentor';
    const frame = document.createElement('div');
    Object.assign(frame.dataset, { photo: slot, label: 'Portrait', tone: tones[i % 4], alt: m.name });
    const name = document.createElement('p');
    name.className = 'mentor__name';
    name.textContent = m.name;
    const role = document.createElement('p');
    role.className = 'mentor__role';
    role.textContent = `${m.role}, ${m.department}`;
    const tags = document.createElement('ul');
    tags.className = 'mentor__tags';
    tags.setAttribute('aria-label', 'Teaches');
    m.teaches.forEach((t) => {
      const tag = document.createElement('li');
      tag.textContent = t;
      tags.append(tag);
    });
    li.append(frame, name, role, tags);
    grid.append(li);
  });
}

function startLite() {
  root.classList.replace('full', 'lite');
  removeIntro();
  setupChrome(null);
}

function startFull() {
  scrollTo(0, 0);
  // Wheel input amplified and eased like the reference (each flick glides further)
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1.2 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();

  const heroIn = setupHero(lenis);
  setupReveals();
  setupStatement();
  setupTracks();
  setupVenue();
  setupWarp();
  setupPaths();
  setupMentors();
  setupChrome(lenis);

  runIntro({
    onReveal: heroIn,
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
