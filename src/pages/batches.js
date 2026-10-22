// /batches/: one large card per batch, each opening that batch's own page.
import { initInner, batchCard } from './inner.js';
import { getBatches, getBatchStats } from '../lib/data.js';
import { emptyState } from '../lib/render.js';

async function start() {
  const box = document.querySelector('.bcards');
  const [batches, stats] = await Promise.all([getBatches(), getBatchStats()]);
  box.replaceChildren(
    ...(batches.length ? batches.map((b, i) => batchCard(b, stats[b.id], i)) : [emptyState('Batches will appear here once they are added.')]),
  );
  await initInner();
}

start();
