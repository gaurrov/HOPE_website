import gsap from 'gsap';
import { initInner, renderChips, isLite } from './inner.js';
import { getBatches, getStudents, getProjects, formatDate } from '../lib/data.js';
import { emptyState } from '../lib/render.js';
import { peopleBrowser, projectCards, placementsBoard } from '../lib/people.js';

const chipsBox = document.querySelector('.chips');
const hero = {
  name: document.querySelector('.bhero__name'),
  dates: document.querySelector('.bhero__dates'),
  desc: document.querySelector('.bhero__desc'),
};
const tabs = [...document.querySelectorAll('.ptab')];
const panels = {
  students: document.getElementById('panel-students'),
  projects: document.getElementById('panel-projects'),
  placements: document.getElementById('panel-placements'),
};

// Numbers count up from zero (or just appear in lite mode)
function setStat(name, value) {
  const dd = document.querySelector(`[data-stat="${name}"]`);
  dd._count?.kill();
  const suffix = dd.dataset.suffix || '';
  if (value == null) {
    dd.textContent = '-';
    return;
  }
  if (isLite()) {
    dd.textContent = `${value}${suffix}`;
    return;
  }
  const obj = { v: 0 };
  const decimals = Number.isInteger(Number(value)) ? 0 : 1;
  dd._count = gsap.to(obj, {
    v: Number(value),
    duration: 1.1,
    ease: 'power3.out',
    onUpdate: () => (dd.textContent = `${obj.v.toFixed(decimals)}${suffix}`),
  });
}

function setParam(key, value) {
  const url = new URL(location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  history.replaceState(null, '', url);
}

function showTab(name) {
  tabs.forEach((t) => {
    const on = t.dataset.tab === name;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    panels[t.dataset.tab].hidden = !on;
  });
  setParam('tab', name === 'students' ? '' : name);
}

async function start() {
  await initInner();
  const batches = await getBatches();
  if (!batches.length) {
    panels.students.replaceChildren(emptyState('Batches will appear here once they are added.'));
    return;
  }

  const browser = peopleBrowser(panels.students, { emptyText: 'Students for this batch will be listed here soon.' });
  let current = { students: [], projects: [] };

  tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
  document.querySelector('.ptabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const to = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    to.focus();
    showTab(to.dataset.tab);
  });

  const setActive = renderChips(
    chipsBox,
    batches.map((b) => ({ label: b.name, value: b.slug })),
    (slug) => pick(slug),
  );

  let request = 0;
  async function pick(slug) {
    const batch = batches.find((b) => b.slug === slug) || batches[0];
    const mine = ++request;
    // Show that the new batch is loading instead of leaving the old numbers up
    document.querySelector('.bhero').classList.add('is-loading');
    document.querySelectorAll('[data-stat]').forEach((dd) => {
      dd._count?.kill();
      dd.textContent = '...';
    });
    setActive(batch.slug);
    setParam('b', batch.slug);

    hero.name.textContent = batch.name;
    hero.dates.textContent = [formatDate(batch.starts_on), formatDate(batch.ends_on)].filter(Boolean).join(' to ');
    hero.desc.textContent = batch.description || '';

    const [students, projects] = await Promise.all([getStudents(batch.id), getProjects(batch.id)]);
    if (mine !== request) return; // a newer batch was picked while this one loaded
    document.querySelector('.bhero').classList.remove('is-loading');
    current = { students, projects };
    const placed = students.filter((s) => s.company);
    const top = Math.max(...placed.map((s) => Number(s.package_lpa) || 0), 0);
    setStat('students', students.length);
    setStat('placed', placed.length);
    setStat('top', top || null);
    setStat('projects', projects.length);

    browser.set(students, projects);
    const openById = (id) => {
      const s = current.students.find((x) => x.id === id);
      if (s) browser.open(s);
    };
    projectCards(panels.projects, projects, openById);
    placementsBoard(panels.placements, students, (s) => browser.open(s));
  }

  const params = new URLSearchParams(location.search);
  await pick(params.get('b'));
  showTab(['projects', 'placements'].includes(params.get('tab')) ? params.get('tab') : 'students');
}

start();
