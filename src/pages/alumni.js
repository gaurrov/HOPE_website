import { initInner, showCards, renderChips } from './inner.js';
import { getAlumni } from '../lib/data.js';
import { personCard, emptyState } from '../lib/render.js';

const chipsBox = document.querySelector('.chips');
const grid = document.querySelector('.people-grid');

async function start() {
  await initInner();
  const alumni = await getAlumni();
  if (!alumni.length) {
    chipsBox.hidden = true;
    showCards(grid, [emptyState('Alumni will be listed here as batches graduate.')]);
    return;
  }

  // Filter chips: All, then each batch that has alumni
  const batches = [...new Map(alumni.filter((a) => a.batch).map((a) => [a.batch.slug, a.batch])).values()];
  const setActive = renderChips(
    chipsBox,
    [{ label: 'All', value: '' }, ...batches.map((b) => ({ label: b.name, value: b.slug }))],
    show,
  );

  function show(slug) {
    setActive(slug);
    const list = slug ? alumni.filter((a) => a.batch?.slug === slug) : alumni;
    showCards(grid, list.map((a, i) => personCard(a, i, { showBatch: true })));
  }
  show('');
}

start();
