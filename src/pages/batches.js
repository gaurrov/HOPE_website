import { initInner, showCards, renderChips } from './inner.js';
import { getBatches, getStudents, formatDate } from '../lib/data.js';
import { personCard, emptyState } from '../lib/render.js';

const chipsBox = document.querySelector('.chips');
const grid = document.querySelector('.people-grid');
const info = {
  name: document.querySelector('.batch-info__name'),
  meta: document.querySelector('.batch-info__meta'),
  desc: document.querySelector('.batch-info__desc'),
};

async function start() {
  await initInner();
  const batches = await getBatches();
  if (!batches.length) {
    grid.replaceWith(emptyState('Batches will appear here once they are added.'));
    return;
  }

  const setActive = renderChips(
    chipsBox,
    batches.map((b) => ({ label: b.name, value: b.slug })),
    (slug) => pick(slug, true),
  );

  async function pick(slug, push) {
    const batch = batches.find((b) => b.slug === slug) || batches[0];
    setActive(batch.slug);
    if (push) history.replaceState(null, '', `?b=${batch.slug}`);

    info.name.textContent = batch.name;
    const range = [formatDate(batch.starts_on), formatDate(batch.ends_on)].filter(Boolean).join(' to ');
    info.desc.textContent = batch.description || '';

    const students = await getStudents(batch.id);
    const placed = students.filter((s) => s.company).length;
    info.meta.textContent = [range, `${students.length} ${students.length === 1 ? 'student' : 'students'}`, placed ? `${placed} placed or working` : '']
      .filter(Boolean)
      .join('. ');

    showCards(
      grid,
      students.length ? students.map((s, i) => personCard(s, i)) : [emptyState('Students for this batch will be listed here soon.')],
    );
  }

  pick(new URLSearchParams(location.search).get('b'), false);
}

start();
