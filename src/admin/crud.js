// Generic list + add/edit/delete screen for one table, plus the configs for events, batches and mentors.
import { supabase } from '../lib/supabase.js';
import { formatDate, formatTime } from '../lib/data.js';
import { h, table, thumb, toast, formDialog, confirmAction, resolveImage, removeImage, errorMessage } from './ui.js';

const yesNo = (v) => (v ? 'Yes' : 'No');

export function crudView(cfg) {
  return async function mount(panel) {
    let rows = [];
    const search = h('input', { type: 'search', class: 'asearch', placeholder: `Search ${cfg.title.toLowerCase()}`, 'aria-label': 'Search' });
    const listBox = h('div');
    panel.replaceChildren(
      h(
        'div',
        { class: 'panel__head' },
        h('div', {}, h('h1', { class: 'panel__title', text: cfg.title }), cfg.intro ? h('p', { class: 'panel__intro', text: cfg.intro }) : null),
        h('button', { type: 'button', class: 'abtn abtn--primary', text: `Add ${cfg.noun}`, onclick: () => edit(null) }),
      ),
      h('div', { class: 'toolbar' }, search),
      listBox,
    );

    async function load() {
      let q = supabase.from(cfg.table).select(cfg.select || '*');
      for (const [col, opts] of cfg.order || []) q = q.order(col, opts);
      const { data, error } = await q;
      if (error) return toast(errorMessage(error), 'error');
      rows = data;
      draw();
    }

    function draw() {
      const term = search.value.trim().toLowerCase();
      const shown = term ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(term)) : rows;
      listBox.replaceChildren(
        table(cfg.columns, shown, (row) => [
          h('button', { type: 'button', class: 'abtn abtn--small', text: 'Edit', onclick: () => edit(row) }),
          h('button', { type: 'button', class: 'abtn abtn--small abtn--danger', text: 'Delete', onclick: () => remove(row) }),
        ]),
      );
    }
    search.addEventListener('input', draw);

    async function edit(row) {
      const fields = typeof cfg.fields === 'function' ? await cfg.fields() : cfg.fields;
      const saved = await formDialog({
        title: row ? `Edit ${cfg.noun}` : `Add ${cfg.noun}`,
        fields,
        values: row || {},
        onSubmit: async (values) => {
          const payload = { ...values };
          for (const f of fields) if (f.type === 'image') payload[f.name] = await resolveImage(values[f.name], cfg.folder);
          const query = row ? supabase.from(cfg.table).update(payload).eq('id', row.id) : supabase.from(cfg.table).insert(payload);
          const { error } = await query;
          if (error) throw new Error(errorMessage(error));
        },
      });
      if (saved) {
        toast(row ? `${cfg.noun[0].toUpperCase() + cfg.noun.slice(1)} updated` : `${cfg.noun[0].toUpperCase() + cfg.noun.slice(1)} added`);
        load();
      }
    }

    async function remove(row) {
      const label = row[cfg.labelKey || 'name'] || row.title || row.full_name || cfg.noun;
      if (!(await confirmAction(`Delete "${label}"? This can't be undone.`))) return;
      const { error } = await supabase.from(cfg.table).delete().eq('id', row.id);
      if (error) return toast(errorMessage(error), 'error');
      for (const f of cfg.imageFields || []) await removeImage(row[f]);
      toast(`Deleted "${label}"`);
      load();
    }

    load();
  };
}

// ---------- Configs ----------
export const eventsView = crudView({
  title: 'Events',
  noun: 'event',
  table: 'events',
  folder: 'events',
  labelKey: 'title',
  imageFields: ['poster_path'],
  intro: 'Events with a start time in the future show under "Coming up" on the home page; the rest move to "Past events".',
  order: [['starts_at', { ascending: false }]],
  columns: [
    { label: 'Poster', render: (r) => thumb(r.poster_path) },
    { label: 'Title', key: 'title' },
    { label: 'When', render: (r) => `${formatDate(r.starts_at)}, ${formatTime(r.starts_at)}` },
    { label: 'Venue', key: 'venue' },
    { label: 'Status', render: (r) => (new Date(r.ends_at || r.starts_at) < new Date() ? 'Done' : 'Upcoming') },
    { label: 'Published', render: (r) => yesNo(r.is_published) },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, wide: true },
    { name: 'starts_at', label: 'Starts', type: 'datetime', required: true },
    { name: 'ends_at', label: 'Ends', type: 'datetime' },
    { name: 'venue', label: 'Venue', placeholder: 'Programming Lab 3, Block B' },
    { name: 'register_url', label: 'Registration link', type: 'url', placeholder: 'https://' },
    { name: 'summary', label: 'Short summary', type: 'textarea', rows: 2, wide: true, hint: 'One or two sentences shown on the event card.' },
    { name: 'description', label: 'Full description', type: 'textarea', rows: 5, wide: true },
    { name: 'poster_path', label: 'Poster or photo', type: 'image', wide: true },
    { name: 'is_published', label: 'Show on the website', type: 'checkbox', default: true },
  ],
});

export const batchesView = crudView({
  title: 'Batches',
  noun: 'batch',
  table: 'batches',
  labelKey: 'name',
  intro: 'Batches appear as chips on the Batches page in the order given by "Position".',
  order: [['sort_order', { ascending: true }], ['name', { ascending: true }]],
  columns: [
    { label: 'Name', key: 'name' },
    { label: 'Web address', render: (r) => `/batches/?b=${r.slug}` },
    { label: 'Dates', render: (r) => [formatDate(r.starts_on), formatDate(r.ends_on)].filter(Boolean).join(' to ') },
    { label: 'Position', key: 'sort_order' },
    { label: 'Published', render: (r) => yesNo(r.is_published) },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true, placeholder: 'Elite' },
    { name: 'slug', label: 'Short name for the web address', required: true, placeholder: 'elite', hint: 'Lowercase letters, numbers and dashes only, like batch-4.' },
    { name: 'starts_on', label: 'Starts on', type: 'date' },
    { name: 'ends_on', label: 'Ends on', type: 'date' },
    { name: 'sort_order', label: 'Position', type: 'number', default: 0 },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3, wide: true },
    { name: 'is_published', label: 'Show on the website', type: 'checkbox', default: true },
  ],
});

export const mentorsView = crudView({
  title: 'Mentors',
  noun: 'mentor',
  table: 'mentors',
  folder: 'mentors',
  labelKey: 'full_name',
  imageFields: ['photo_path'],
  intro: 'Mentors assigned by the college. They show in "Meet the mentors" on the home page.',
  order: [['sort_order', { ascending: true }], ['full_name', { ascending: true }]],
  columns: [
    { label: 'Photo', render: (r) => thumb(r.photo_path) },
    { label: 'Name', key: 'full_name' },
    { label: 'Role', render: (r) => [r.role, r.department].filter(Boolean).join(', ') },
    { label: 'Teaches', render: (r) => (r.teaches || []).join(', ') },
    { label: 'Published', render: (r) => yesNo(r.is_published) },
  ],
  fields: [
    { name: 'full_name', label: 'Name', required: true },
    { name: 'role', label: 'Role', placeholder: 'Assistant Professor' },
    { name: 'department', label: 'Department', placeholder: 'Computer Science' },
    { name: 'teaches', label: 'Teaches', type: 'tags', placeholder: 'DSA, Python', hint: 'Separate topics with commas.' },
    { name: 'sort_order', label: 'Position', type: 'number', default: 0 },
    { name: 'photo_path', label: 'Photo', type: 'image', wide: true },
    { name: 'is_published', label: 'Show on the website', type: 'checkbox', default: true },
  ],
});
