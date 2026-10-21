import { initInner, renderChips } from './inner.js';
import { getAlumni, getProjects } from '../lib/data.js';
import { peopleBrowser } from '../lib/people.js';

const chipsBox = document.querySelector('.chips');
const box = document.querySelector('.alumni-browser');

async function start() {
  await initInner();
  const [alumni, projects] = await Promise.all([getAlumni(), getProjects()]);
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
