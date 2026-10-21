import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/sections.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

import { fillAllFrames } from './frames.js';
import { waitForGate, runIntro, removeIntro } from './modules/intro.js';
import { buildRing, setupHero } from './modules/hero.js';
import { setupReveals, setupStatement, setupTracks, setupVenue, setupPaths } from './modules/scenes.js';
import { setupWarp } from './modules/warp.js';
import { setupChrome, setLitePref } from './modules/chrome.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

fillAllFrames();
buildRing();

function startLite() {
  root.classList.replace('full', 'lite');
  removeIntro();
  setupChrome(null);
}

function startFull() {
  scrollTo(0, 0);
  const lenis = new Lenis({ lerp: 0.1 });
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
  const choice = await waitForGate();
  if (choice === 'lite') {
    setLitePref(true);
    return startLite();
  }
  startFull();
}

boot();
