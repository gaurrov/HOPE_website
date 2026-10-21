// Sample data: everything created as mock content is flagged is_sample. Remove it all in one go
// once the real students, projects, events and mentors are in.
import { supabase } from '../lib/supabase.js';
import { h, toast, confirmAction, errorMessage } from './ui.js';

const TABLES = [
  { table: 'projects', label: 'Projects' },
  { table: 'students', label: 'Students (their private details and project memberships go with them)' },
  { table: 'events', label: 'Events' },
  { table: 'mentors', label: 'Mentors' },
];

export async function sampleDataView(panel) {
  const box = h('div');
  panel.replaceChildren(
    h(
      'div',
      { class: 'panel__head' },
      h(
        'div',
        {},
        h('h1', { class: 'panel__title', text: 'Sample data' }),
        h('p', { class: 'panel__intro', text: 'Mock content added so the site looks complete while real data is gathered. It is marked as sample everywhere, and you can remove all of it here once your real data is in.' }),
      ),
    ),
    box,
  );

  async function load() {
    const counts = await Promise.all(
      TABLES.map(async (t) => {
        const { count, error } = await supabase.from(t.table).select('id', { count: 'exact', head: true }).eq('is_sample', true);
        return { ...t, count: error ? null : count };
      }),
    );
    const total = counts.reduce((n, c) => n + (c.count || 0), 0);
    const remove = h('button', {
      type: 'button',
      class: 'abtn abtn--danger',
      text: 'Delete all sample data',
      disabled: total === 0,
      onclick: async () => {
        if (!(await confirmAction(`Delete ${total} sample rows from the website? Real data you added is not touched. This can't be undone.`, 'Delete sample data'))) return;
        for (const t of TABLES) {
          const { error } = await supabase.from(t.table).delete().eq('is_sample', true);
          if (error) return toast(errorMessage(error), 'error');
        }
        toast('Sample data deleted');
        load();
      },
    });
    box.replaceChildren(
      h('ul', { class: 'sample-list' }, ...counts.map((c) => h('li', {}, h('strong', { text: c.count ?? '?' }), ` ${c.label}`))),
      total ? remove : h('p', { class: 'panel__intro', text: 'There is no sample data left.' }),
    );
  }

  load();
}
