import { initInner, renderChips } from './inner.js';
import { getAlumni, getProjects, formatPackage } from '../lib/data.js';
import { peopleBrowser } from '../lib/people.js';

const chipsBox = document.querySelector('.chips');
const box = document.querySelector('.alumni-browser');
const statsBox = document.querySelector('.alumni-stats');

// Every figure comes from the published rows, so the cards can't drift from the list below them
function renderStats(alumni) {
  if (!alumni.length) return;
  const placed = alumni.filter((a) => a.company).length;
  const paid = alumni.filter((a) => a.package_lpa != null);
  const top = paid.reduce((best, a) => (!best || Number(a.package_lpa) > Number(best.package_lpa) ? a : best), null);
  const average = paid.reduce((sum, a) => sum + Number(a.package_lpa), 0) / (paid.length || 1);
  const cards = [
    ['Graduates', alumni.length, 'Listed on this page'],
    ...(top
      ? [
          ['Top package', formatPackage(top.package_lpa), top.company ? `At ${top.company}` : ''],
          ['Average package', formatPackage(average.toFixed(1)), `Across ${paid.length} published`],
        ]
      : []),
    ['Placement rate', `${Math.round((placed / alumni.length) * 100)}%`, `${placed} of ${alumni.length} placed or working`],
  ];
  statsBox.replaceChildren(
    ...cards.map(([label, value, sub]) => {
      const card = document.createElement('div');
      card.className = 'astat-card';
      [['astat-label', label], ['astat-value', value], ['astat-sub', sub]].forEach(([className, text]) => {
        const span = document.createElement('span');
        span.className = className;
        span.textContent = text;
        card.append(span);
      });
      return card;
    }),
  );
  statsBox.hidden = false;
}

async function start() {
  await initInner();
  const [alumni, projects] = await Promise.all([getAlumni(), getProjects()]);
  renderStats(alumni);
  const browser = peopleBrowser(box, { showBatch: true, emptyText: 'Alumni will be listed here as batches graduate.' });

  // Batch chips narrow the list; the browser handles search, filters, sort and layout
  const batches = [...new Map(alumni.filter((a) => a.batch).map((a) => [a.batch.slug, a.batch])).values()];
  if (batches.length < 2) chipsBox.hidden = true;
  const setActive = renderChips(chipsBox, [{ label: 'All batches', value: '' }, ...batches.map((b) => ({ label: b.name, value: b.slug }))], show);

  function show(slug) {
    setActive(slug);
    browser.set(slug ? alumni.filter((a) => a.batch?.slug === slug) : alumni, projects);
  }
  show('');
}

start();
