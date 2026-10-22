// One batch's own page: /batches/<slug>/ (e.g. /batches/elite/). The slug comes from the address.
import gsap from 'gsap';
import { initInner, isLite, batchCard } from './inner.js';
import { getBatches, getBatchStats, getStudents, getProjects, formatDate } from '../lib/data.js';
import { peopleBrowser, projectCards, placementsBoard } from '../lib/people.js';

const title = document.querySelector('.page__title');
const dates = document.querySelector('.bhero__dates');
const desc = document.querySelector('.bhero__desc');
const tabs = [...document.querySelectorAll('.ptab')];
const panels = {
  students: document.getElementById('panel-students'),
  projects: document.getElementById('panel-projects'),
  placements: document.getElementById('panel-placements'),
};

const params = new URLSearchParams(location.search);
const slug = location.pathname.match(/^\/batches\/([^/]+)\/?$/)?.[1];
const wanted = slug && slug !== 'view' ? decodeURIComponent(slug).toLowerCase() : params.get('b');

// Numbers count up from zero (or just appear in lite mode)
function setStat(name, value) {
  const dd = document.querySelector(`[data-stat="${name}"]`);
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
  gsap.to(obj, {
    v: Number(value),
    duration: 1.1,
    ease: 'power3.out',
    onUpdate: () => (dd.textContent = `${obj.v.toFixed(decimals)}${suffix}`),
  });
}

function showTab(name) {
  tabs.forEach((t) => {
    const on = t.dataset.tab === name;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    panels[t.dataset.tab].hidden = !on;
  });
  const url = new URL(location.href);
  if (name === 'students') url.searchParams.delete('tab');
  else url.searchParams.set('tab', name);
  history.replaceState(null, '', url);
}

function notFound(batches) {
  title.textContent = 'No batch here';
  document.title = 'Batch not found | HOPE';
  dates.textContent = 'There is no HOPE batch at this address. Pick one of the batches below.';
  document.querySelector('.stats').hidden = true;
  desc.textContent = '';
  document.querySelector('.batch-body').hidden = true;
  return batches;
}

async function start() {
  const [batches, stats] = await Promise.all([getBatches(), getBatchStats()]);
  const batch = batches.find((b) => b.slug === wanted);

  // Fill the title before the page intro splits it into letters
  const others = batch ? batches.filter((b) => b.id !== batch.id) : notFound(batches);
  if (batch) {
    title.textContent = batch.name;
    document.title = `${batch.name} | HOPE`;
    dates.textContent = [formatDate(batch.starts_on), formatDate(batch.ends_on)].filter(Boolean).join(' to ');
    desc.textContent = batch.description || '';
  }
  if (others.length) {
    const box = document.querySelector('.others');
    box.hidden = false;
    if (!batch) box.querySelector('.others__title').textContent = 'HOPE batches';
    box.querySelector('.bcards').replaceChildren(...others.map((b, i) => batchCard(b, stats[b.id], i)));
  }
  await initInner();
  if (!batch) return;

  tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
  document.querySelector('.ptabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const to = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    to.focus();
    showTab(to.dataset.tab);
  });

  const browser = peopleBrowser(panels.students, { emptyText: 'Students for this batch will be listed here soon.' });
  document.querySelectorAll('[data-stat]').forEach((dd) => (dd.textContent = '...'));
  const [students, projects] = await Promise.all([getStudents(batch.id), getProjects(batch.id)]);
  const placed = students.filter((s) => s.company);
  const top = Math.max(...placed.map((s) => Number(s.package_lpa) || 0), 0);
  setStat('students', students.length);
  setStat('placed', placed.length);
  setStat('top', top || null);
  setStat('projects', projects.length);

  browser.set(students, projects);
  const openById = (id) => {
    const s = students.find((x) => x.id === id);
    if (s) browser.open(s);
  };
  projectCards(panels.projects, projects, openById);
  placementsBoard(panels.placements, students, (s) => browser.open(s));
  showTab(['projects', 'placements'].includes(params.get('tab')) ? params.get('tab') : 'students');
}

start();
